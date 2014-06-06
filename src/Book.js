(function(window) {

var jsb = window.jsb = window.jsb || {};

var Book = function(options) {
    Book.instance = this;

    var i;

    options = options || {};

    if (options instanceof HTMLElement) {
        options = {
            '$el': $(options || document.body)
        };
    } else {
        options.$el = $(options.el || document.body);
        delete options.el;
    }

    $.extend(this, {
        topMargin: 20,
        bottomMargin: 20,
        leftMargin: 20,
        rightMargin: 20,
        showPage: 1,
        sections: [],
        page: 0
    });

    if (options.sources) {
        var sources = options.sources;
        for(i in sources) {
            this.sections.push(new jsb.Section({
                book: this,
                src: sources[i]
            }));
        }
        delete options.sources;
    } else if (options.sections) {
        var sections = options.sections;
        for(i in sections) {
            sections[i].book = this;
            this.sections.push(sections[i]);
        }
        delete options.sections;
    } else if (options.contents) {
        var contents = options.contents;
        for(i in contents) {
            contents[i] = jsb.Section.prototype.normalizeContent(contents[i]);
            this.sections.push(new jsb.Section({
                book: this,
                content: contents[i]
            }));
        }
        delete options.contents;
    }

    $.extend(this, options);
};

Book.prototype = jsb.Emitter({
    display: function(options) {
        options = options || 0;

        if (!isNaN(options)) {
            options = {
                page: options
            };
        }

        if (typeof(options.page) !== 'undefined') {
            this.go(options.page);
        }
    },

    createPage: function() {
        var $page = $('<div class="jsb-page"></div>');
        $page.css({
            'padding-top': this.topMargin,
            'padding-bottom': this.bottomMargin,
            'padding-left': this.leftMargin,
            'padding-right': this.rightMargin
        }).appendTo(this.$el);
        return $page;
    },

    resetPages: function() {
        delete this.$hiddenPages;
        delete this.$activePages;
        this.$el.html('');
    },

    hasHiddenPages: function() {
        return (typeof(this.$hiddenPages) !== 'undefined');
    },

    hasActivePages: function() {
        return (typeof(this.$activePages) !== 'undefined');
    },

    swapPages: function(page) {
        var that = this;

        var doSwap = function() {
            var $hiddenPages = that.getHiddenPages(),
                $activePages = that.getActivePages();

            for (var i = 0; i < $hiddenPages.length; i++) {
                $hiddenPages[i].removeClass('jsb-hidden').addClass('jsb-active');
                $activePages[i].removeClass('jsb-active').addClass('jsb-hidden');
            }

            that.$hiddenPages = $activePages;
            that.$activePages = $hiddenPages;
        };

        var handled = this.emit('book:swap', this, page, doSwap);
        if (!handled) {
            doSwap();
        }
    },

    getHiddenPages: function() {
        var i;

        if (!this.hasHiddenPages()) {
            this.$hiddenPages = [];

            for(i = 0; i < arguments.length; i++) {
                var $page = this.createPage().addClass('jsb-hidden jsb-page-' + i);
                this.$hiddenPages.push($page);
            }
        }

        for(i = 0; i < arguments.length; i++) {
            var page = arguments[i],
                section = this.getSectionByPage(page);
            if (section) {
                var p = section.getPage(page);
                console.log(p[0]);
                this.$hiddenPages[i].html(p);
            } else {
                console.error('[Book]', 'Section not found for page:', page);
            }
        }

        return this.$hiddenPages;
    },

    getActivePages: function() {
        var i;

        if (!this.hasActivePages()) {
            this.$activePages = [];

            for(i = 0; i < arguments.length; i++) {
                var $page = this.createPage().addClass('jsb-active jsb-page-' + i);
                this.$activePages.push($page);
            }
        }

        for(i = 0; i < arguments.length; i++) {
            var page = arguments[i],
                section = this.getSectionByPage(page);
            if (section) {
                this.$activePages[i].html(section.getPage(page));
            } else {
                console.error('[Book]', 'Section not found for:', page);
            }
        }

        return this.$activePages;
    },

    go: function(page) {
        var $activePages, $hiddenPages;

        if (this.showPage === 2 && page % 2) {
            page = page - 1;
        }

        if (this.showPage === 1) {
            if (this.hasActivePages()) {
                $hiddenPages = this.getHiddenPages(page);
                this.swapPages(page);
            } else {
                $activePages = this.getActivePages(page);
            }
        } else {
            console.log(page, page + 1);
            if (this.hasActivePages()) {
                $hiddenPages = this.getHiddenPages(page, page + 1);
                this.swapPages();
            } else {
                $activePages = this.getActivePages(page, page + 1);
            }
        }

        this.page = page;
    },

    next: function() {
        console.log('next');
        this.go(this.page + this.showPage);
    },

    prev: function() {
        console.log('prev');
        this.go(this.page - this.showPage);
    },

    initialize: function(options) {
        $.extend(this, options);

        return this.calculate();
    },

    calculate: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            var start = 0,
                iterator = 0,
                sections = that.sections,
                count = sections.length;

            var calcNext = function() {
                if (iterator >= count) {
                    that.resetPages();
                    return resolve();
                }

                // console.log('calcNext', iterator);

                sections[iterator].calculate(start).then(function(last) {
                    start = last + 1;
                    iterator++;
                    calcNext();
                }, function(e1) {
                    var e = new Error('Error on calculate section:' + iterator + '\nTriggered by: ' + e1.stack);
                    reject(e);
                });
            };

            setTimeout(function() {
                calcNext();
            });
        });
    },

    getSectionByPage: function(page) {
        var found;
        for(var i in this.sections) {
            var section = this.sections[i],
                range = section.range;
            if (page >= range[0] && page <= range[1]) {
                found = section;
                break;
            }
        }
        console.log('getSectionByPage', page, found);
        return found;
    },

    getPageDimension: function(prop) {
        var w = Math.floor((this.$el.width() / this.showPage) - (this.leftMargin + this.rightMargin)),
            h = this.$el.height() - this.topMargin - this.bottomMargin;

        // console.log(w, h);

        if (!prop) {
            return {
                width: w,
                height: h
            };
        } else if (prop[0] === 'w') {
            return w;
        } else if (prop[0] === 'h') {
            return h;
        }
    }

});

jsb.Book = Book;

})(window);