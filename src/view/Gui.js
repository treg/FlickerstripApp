define(['jquery','underscore','util.js','tinycolor','ControlsView.js','LEDStripRenderer.js', 'SelectList.js',"GroupDetailsPanel.js","text!../tmpl/stripList.html",'jquery.contextMenu'],
function($,_, util, tinycolor, ControlsView, LEDStripRenderer, SelectList, GroupDetailsPanel,template) {
    var This = function(window) {
        this.window = window;
        var document = window.document;
        this.document = window.document;
        $(document).ready(_.bind(function() {
            this.init(document);
        },this));
    }

    function getSelectedArray($el) {
        var selected = [];
        $el.find(":selected").each(function() {
            selected.push($(this).val());
        });
        return selected;
    }

    $.extend(This.prototype,{
        canvas:null,
        stripListComponent:null,
        stripRenderer:null,
        activePattern:null,
        init:function(document) {
            this.$el = $(document.body);

            this.render();

            $(this).on("ReceivedPatternMetadata",_.bind(function(strip,patterns) {
                console.log("receive pattern metadata called..");
                if (this.groupDetails) console.log(this.groupDetails,this.groupDetails.strip.id,strip.id,patterns);
                if (this.groupDetails && this.groupDetails.strip.id == strip.id) {
                    this.groupDetails.refreshPatterns(patterns);
                }
            },this));
        },
        handleStripEvent(eventType,stripId) {
            this.selectList.each(function(strip,$el) {
                if (strip.id == stripId) {
                    $(strip).trigger(eventType);
                }
            });
        },
        setManager:function(manager) {
            this.manager = manager;
            manager.on("StripAdded",_.bind(this.stripAdded,this));
        },
        stripAdded:function(strip) {
            console.log("strip added",strip);
            this.selectList.addElement(strip);
            var self = this;
            strip.on("StripStatusUpdated",function(strip) {
                self.selectList.updateElement(strip);
            });
            strip.on("NameUpdated",function(strip) {
                self.selectList.updateElement(strip);
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
        },
        selectSingleStrip:function(strip) {
            this.groupDetails = new GroupDetailsPanel(this.manager,strip);
            this.$el.find(".groupDetails").empty().append(this.groupDetails.$el);
        },
        selectMultipleStrips:function(strips){
            var $el = this.$el.find("#activeStrip");
            $el.find("#nameValue").off("dblclick");
            $el.find("#identifierValue").hide();
            $el.find("#nameValue").text(strips.length+" selected");
            $el.find(".statusIndicator").css("visibility","hidden");
        },
        render:function() {
            this.$el.empty();
            this.$el.append(_.template(template)());

            this.activePattern = null; //todo: select correct pattern
            var $stripList = this.$el.find("#strip-list");
            var selectList = new SelectList([],this.stripElementRenderer);
            this.selectList = selectList;
            $stripList.append(selectList.$el);

            var self = this;
            $.contextMenu( 'destroy' );
            $.contextMenu({
                selector: ".listElement",
                    items: {
                        foo: {name: "Forget Strip", callback: function(key, opt){
                            var obj = $(this).data("object")
                            $(self).trigger("ForgetStrip",[obj.id]);
                        }},
                        //bar: {name: "Boo", callback: function(key, opt){ console.log("bar arguments: ",arguments); }},
                    }
            });

            $(selectList).on("change",_.bind(this.stripSelected,this));
        },
        stripElementRenderer:function(strip,$el) {
            var name = strip.getName();
            if (!name) name = "Unknown Strip";

            if ($el) {
                $el.find(".stripName").text(name);
                var statusClass = strip.connection ? "connected" : "error";
                $el.find(".statusIndicator").removeClass("connected").removeClass("error").addClass(statusClass);
            } else {
                $el = $("<li class='list-group-item listElement' />");
                var statusClass = strip.connection ? "connected" : "error";
                $el.append($("<span class='statusIndicator'></span>").addClass(statusClass));
                $el.append($("<span class='stripName'></span>").text(name));
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
