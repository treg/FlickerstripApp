define(['jquery','underscore','view/util.js','tinycolor','view/ControlsView.js','view/LEDStripRenderer.js', 'view/SelectList.js',"view/GroupDetailsPanel.js","shared/util.js","text!tmpl/stripList.html",'jquery.contextMenu'],
function($,_, gutil, tinycolor, ControlsView, LEDStripRenderer, SelectList, GroupDetailsPanel,util,template) {
    var This = function(window,send) {
        this.window = window;
        var document = window.document;
        this.document = window.document;
        $(document).ready(_.bind(function() {
            this.init(document,send);
        },this));
    }
    function getSelectedArray($el) {
        var selected = [];
        $el.find(":selected").each(function() {
            selected.push($(this).val());
        });
        return selected;
    }

    function setVersionClass($el,firmware,latest) {
        if (!firmware || !latest) return;
        var fn = util.symanticToNumeric(firmware);
        var ln = util.symanticToNumeric(latest);

        $el.removeClass("uptodate");
        $el.removeClass("outofdate");
        $el.removeClass("devversion");

        if (fn == ln) $el.addClass("uptodate");

        if (fn < ln) $el.addClass("outofdate");
        if (fn > ln) $el.addClass("devversion");
    }

    $.extend(This.prototype,{
        canvas:null,
        stripListComponent:null,
        stripRenderer:null,
        activePattern:null,
        init:function(document,send) {
            this.send = send;
            this.$el = $(document.body);
            this.$el.addClass("theme1");

            $(this).on("StripAdded",_.bind(this.stripAdded,this));
            $(this).on("StripRemoved",_.bind(this.stripRemoved,this));
            $(this).on("LatestReleaseUpdated",_.bind(this.releaseUpdated,this));

            this.render();

            this.$el.find(".configureNewStrip").on("click",_.bind(function() {
                var $div = $("<div />");
                $div.css({
                    "position":"absolute",
                    "width":"500px",
                    "height":"500px",
                    "top":"100px",
                    "left":"100px"
                });
                $(document.body).append($div);
                var i = 0;
                var a = setInterval(function() {
                    if (i % 2 == 0) {
                        $div.css({"background-color":"white"});
                    } else {
                        $div.css({"background-color":"black"});
                    }
                    i++;
                    if (i > 100) {
                        $div.remove();
                        clearInterval(a);
                    }
                },100);
                //jxcore("gui_RedirectToSettings").call();
            },this));
        },
        releaseUpdated:function(e,release) {
            this.latestRelease = release;
            this.selectList.refresh();
        },
        eventHandler:function() {
            var preprocessors = {
                "Strip.StatusUpdated":function(strip,stripStatus) {
                    $.extend(strip,stripStatus);
                },
            };
            if (arguments[0].indexOf("Strip.") === 0) {
                var strip = this.findStripId(arguments[1]);
                if (preprocessors[arguments[0]]) {
                    preprocessors[arguments[0]].apply(this,[strip].concat(Array.prototype.slice.call(arguments, 2)));
                }
                $(strip).trigger(arguments[0],Array.prototype.slice.call(arguments, 2));
            } else {
                $(this).trigger(arguments[0],Array.prototype.slice.call(arguments, 1));
            }
        },
        findStripId:function(id) {
            var found = null;
            this.selectList.each(function(strip) {
                if (strip.id == id) found = strip;
           });
            return found;
        },
        stripAdded:function(e,strip) {
            this.selectList.addElement(strip,strip.group);
            var self = this;
            $(strip).on("Strip.StatusUpdated",_.bind(function() {
                self.selectList.updateElement(strip);
            },this));
        },
        stripRemoved:function(e,id) {
            this.selectList.$el.find(".listElement").each(function() {
                if ($(this).data("object").id == id) {
                    $(this).remove();
                }
            });
        },
        stripSelected:function(e,selectedStrips,selectedIndexes) {
            this.selectedStrips = selectedStrips;
            if (selectedStrips.length == 1) {
                this.multipleSelected = false;
                this.selectSingleStrip(selectedStrips[0]);
            } else if (selectedStrips.length > 1) {
                this.multipleSelected = true;
                this.selectMultipleStrips(selectedStrips);
            }

            if (selectedStrips.length >= 1) {
                setTimeout(_.bind(function() {
                    this.$el.addClass("groupDetailsShowing");
                },this),5);
            }
        },
        selectSingleStrip:function(strip) {
            this.groupDetails = new GroupDetailsPanel(this.send,[strip],this);
            $(this.groupDetails).on("GroupDetailsDismissed",_.bind(function() {
                this.selectList.deselect();
                this.$el.removeClass("groupDetailsShowing");
            },this));

            this.$el.find(".groupDetails").replaceWith(this.groupDetails.$el);
        },
        selectMultipleStrips:function(strips){
            this.groupDetails = new GroupDetailsPanel(this.send,strips,this);
            $(this.groupDetails).on("GroupDetailsDismissed",_.bind(function() {
                this.selectList.deselect();
                this.$el.removeClass("groupDetailsShowing");
            },this));

            this.$el.find(".groupDetails").replaceWith(this.groupDetails.$el);
        },
        render:function() {
            this.$el.empty();
            this.$el.append(template);

            this.activePattern = null; //todo: select correct pattern
            var $stripList = this.$el.find("#strip-list");
            var selectList = new SelectList([],this.stripElementRenderer,this,null,this.stripElementGroupRenderer);
            this.selectList = selectList;
            $stripList.append(selectList.$el);

            var self = this;
            $.contextMenu( 'destroy' );
            $.contextMenu({
                selector: ".listElement",
                    items: {
                        foo: {name: "Forget Strip", callback:function(key, opt){
                            var obj = $(this).data("object");
                            self.send("ForgetStrip",[obj.id]);
                        }},
                        //bar: {name: "Boo", callback: function(key, opt){ console.log("bar arguments: ",arguments); }},
                    }
            });

            $.contextMenu({
                selector: ".header[data-name!='Ungrouped']",
                    items: {
                        foo: {name: "Delete group", callback:function(key, opt){
                            var group = $(this).data("name");
                            self.$el.find(".listElement").each(function() {
                                if ($(this).data("group") == group) {
                                    $(this).data("group","");
                                    self.send("SetGroup",$(this).data("object").id,"");
                                }
                            });
                            self.selectList.refreshGroupings();
                        }},
                    }
            });

            $(selectList).on("change",_.bind(this.stripSelected,this));
        },
        stripElementGroupRenderer:function(header) {
            return $("<li class='list-group-item header' data-name='"+header+"'>"+header+"</li>");
        },
        stripElementRenderer:function(strip,$el) {
            var name = strip.name;
            if (!name) name = "Unknown Strip";

            if ($el) {
                $el.find(".name").text(name);
                $el.find(".version").text(strip.firmware);
                var $ver = $el.find(".version");
                setVersionClass($ver,strip.firmware,this.latestRelease);
                var statusClass = strip.visible ? "connected" : "error";
                $el.find(".statusIndicator").removeClass("connected").removeClass("error").addClass(statusClass);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                var statusClass = strip.visible ? "connected" : "error";
                $el.append($("<span class='statusIndicator'></span>").addClass(statusClass));
                $el.append($("<span class='name'></span>").text(name));
                $el.append($("<span class='version'></span>").text(strip.firmware));
                var $ver = $el.find(".version");
                setVersionClass($ver,strip.firmware,this.latestRelease);
                $(strip).on("LatestReleaseUpdated",_.bind(function() {
                    setVersionClass($ver,strip.firmware,this.latestRelease);
                },this));

                var $onoff = $("<button class='powerButton'><span class='glyphicon glyphicon-off'></span></button>");
                $onoff.toggleClass("on",strip.power == 1);
                $(strip).on("Strip.StatusUpdated",function() {
                    $onoff.toggleClass("on",strip.power == 1);
                });

                $onoff.click(_.bind(function(e) {
                    if ($onoff.hasClass("on")) {
                        this.send("ToggleStrip",strip.id,0);
                        $onoff.toggleClass("on",false);
                    } else {
                        this.send("ToggleStrip",strip.id,1);
                        $onoff.toggleClass("on",true);
                    }
                    e.stopPropagation();
                    return false;
                },this));
                $el.append($onoff);

            }
            return $el;
        },
        setStrips:function(stripData) {
            this.stripData = stripData;
            this.showStripList();
        }
    });


    return This;
});
