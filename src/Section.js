(function(window) {

var jsb = window.jsb = window.jsb || {};

var $SANDBOX_OUTER = $('.jsb-section');
if ($SANDBOX_OUTER.length === 0) {
    $SANDBOX_OUTER = $('<div class="jsb-section"><div class="jsb-section-content"></div></div>');
    jsb.sandbox().append($SANDBOX_OUTER);
}
var $SANDBOX_INNER = $SANDBOX_OUTER.children();

var Section = function(options) {
    options = options || {};

    $.extend(this, {
        book: jsb.Book.instance,
        range: [-1, -1]
    }, options);
};

Section.prototype = jsb.Emitter({
    calculate: function(start) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var doCalc = function() {
                try {
                    var $sandbox = that.globalSandbox();
                    $sandbox.html(that.content);

                    that.book.emit('section:calculate', that, $sandbox);

                    var pos = $sandbox.find('.jsb-section-ender').position(),
                        lastPage = start + Math.ceil(pos.left / that.book.getPageDimension('w'));

                    that.range = [start, lastPage];

                    that.$template = that.globalSandbox(true).clone();

                    resolve(lastPage);
                } catch(e) {
                    reject(e);
                }
            };

            if (that.src) {
                var handled = that.book.emit('section:getSource', that, function(content) {
                    that.content = that.normalizeContent(content);
                    doCalc();
                });

                if (!handled) {
                    $.get(that.src).then(function(content) {
                        that.content = that.normalizeContent(content);

                        doCalc();
                    }, function() {
                        reject(new Error('Cannot get from url:' + that.src));
                    });
                }

            } else {
                doCalc();
            }
        });
    },

    normalizeContent: function(data) {
        data = data.trim();
        if (data.indexOf('<body') >= 0) {
            data = data.substr(data.indexOf('<body') + 1);
            data = data.substr(data.indexOf('>') + 1);
        } else if (data.indexOf('<BODY') >= 0) {
            data = data.substr(data.indexOf('<BODY') + 1);
            data = data.substr(data.indexOf('>') + 1);
        }

        if (data.indexOf('</body') >= 0) {
            data = data.substr(0, data.indexOf('</body'));
        } else if (data.indexOf('</BODY') >= 0) {
            data = data.substr(0, data.indexOf('</BODY'));
        }

        return data + '<div class="jsb-section-ender"></div>';
    },

    globalSandbox: function(outer) {
        var pageDimension = this.book.getPageDimension();

        $SANDBOX_OUTER.css({
            width: pageDimension.width,
            height: pageDimension.height
        });

        $SANDBOX_INNER.css({
            '-webkit-column-width': pageDimension.width,
            height: pageDimension.height
        });

        if (outer) {
            return $SANDBOX_OUTER;
        } else {
            return $SANDBOX_INNER;
        }
    },

    getPage: function(page) {
        // console.log(page);
        var $section = this.$template.clone();
        $section.children().css('-webkit-transform', 'translateX(-' + ((page - this.range[0]) * this.book.getPageDimension('w')) + 'px)');
        return $section;
    }
});

jsb.Section = Section;

})(window);