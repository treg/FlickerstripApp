var extend = require("extend");
var EventEmitter = require("eventemitter2").EventEmitter2;
var _ = require("underscore")._;
var util = require("util");
var StripWrapper = require("./StripWrapper");

var This = function() {
    this.init.apply(this,arguments);
};

util.inherits(This,EventEmitter);
extend(This.prototype,{
	id:null,
    name:null,
    connection:null,
    patterns:[],
	init:function(connection) {
        if (connection) this.setConnection(connection);
	},
    setConnection:function(connection) {
        this._connection = connection;
        if (this.id == null) this.id = this._connection.id;
        if (this.id != this._connection.id) throw "Error, connection ID mismatch: "+this.id+" =/= "+this._connection.id;

		connection.on("ReceivedPatternMetadata",_.bind(this.receivedPatternMetadata,this));
		connection.on("ProgressUpdate",_.bind(this.progressUpdate,this));
		connection.on("Disconnect",_.bind(this.connectionReset,this));

        this.requestPatterns();
    },
    clearConnection:function() {
        if (this._connection) this._connection.destroy();
        this._connection = null;
    },
    progressUpdate:function(connection) {
        var session = connection.getCurrentSession();
        this.emit("Strip.ProgressUpdated",this,session);
    },
    receivedPatternMetadata:function(connection,patterns) {
        this.patterns = patterns;
        this.emit("Strip.PatternsUpdated",patterns);
    },
    connectionReset:function(connection,error) {
        this.clearConnection();
        this.emit("Disconnect",this);
    },
	requestPatterns:function() {
	    this._connection.sendCommand(StripWrapper.packetTypes.GET_PATTERNS);
	},
    loadPattern:function(name,fps,data) {
        this._connection.sendPattern(name,fps,data);
        this.requestPatterns();
    },
    selectPattern:function(index) {
        this._connection.sendCommand(StripWrapper.packetTypes.SELECT_PATTERN,index);
    },
	forgetPattern:function(index) {
        this._connection.sendCommand(StripWrapper.packetTypes.DELETE_PATTERN,index);
		this.requestPatterns();
    },
	disconnectStrip:function() {
        this._connection.sendCommand(StripWrapper.packetTypes.DISCONNECT_NETWORK);
    },
    setName:function(name) {
        this.name = name;
        this.emit("NameUpdated",this);
    },
    getName:function() {
        return this.name;
    },
});

module.exports = This;
