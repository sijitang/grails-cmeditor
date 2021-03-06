//=require cmeditor-dependencies

this.textAreaCMEditor = function (){
	"use strict";

	function textAreaCMEditor(rootElem, options, instanceName){
		//allow the user to omit new
		if (!(this instanceof textAreaCMEditor)) return new textAreaCMEditor(rootElem, options, instanceName);
		var self = this;
		self.state = {};

		self.state.instanceNo = textAreaCMEditor.instanciated++;
		self.state.instanceName = instanceName !== undefined ? instanceName : "";
		if(self.state.instanceName == "")
			log("No instance name supplied, fullscreen mode will be disabled!", "WARNING");

		var rootElem = self.rootElem = $(rootElem);
		self.options  = options  = options !== undefined ? options : {};

		self.state.eventHooks = {};
		for(var hookName in options.hooks){
			on(self, hookName, options["hooks"][hookName]);
		}

		executeHooks(self, "preInitialization", self, [rootElem, options, instanceName]);

		init(self, rootElem, options);

		if(options.menu){
			var menuRootElem = self.rootElem.find(".cmeditor-menu");
			executeHooks(self, "preMenuInit", menuRootElem);
			self.menu = new CMEditorMenu(self, menuRootElem, options, instanceName);
			executeHooks(self, "postMenuInit", menuRootElem, [self.menu]);
		}

		//disable some browser featues when the codeMirror has focus
		$(document).bind("keydown", function(e){
			if(e.ctrlKey && self.rootElem.find("CodeMirror-focused").size() !== 0){
				e.preventDefault();
			}

			if(e.which == 122 && !self.codeMirror.getOption("readOnly") && (self.rootElem.find("*:focus").size() > 0 || self.codeMirror.hasFocus())){
				toggleFullscreen(self);
				e.preventDefault();
			}
		});

		if(self.options.preloadModules){
			preloadModules(self);
		}

		registerInstance(self.state.instanceName, self.state.instanceNo, self);

		executeHooks(self, "postInitialization", self, [rootElem, options, instanceName]);
	}

	/*************************************************************************
	 *                    Begin 'static' methods                             *
	 *************************************************************************/
	var clazz = textAreaCMEditor;

	clazz.instanciated = 0;
	clazz.instancesNumber = {};
	clazz.instancesString = {};
	clazz.instances = [];
	clazz.loadedResources = [];
	clazz.eventHooks = {};
	clazz.filteredEventHooks = {};

	/*
	 * Logs to the console. If possible prefixed by class name, instance number. The default logLevel is INFO.
	 * Possible values are: ERROR, WARNING, INFO, DEBUG. If Data is supplied, its entries will be printed
	 * one per line
	 *
	 * Possible Parameter combinations:
	 * Message (String), [Loglevel (String, "INFO"), [Data (List of Objects)]]
	 * Instance (Object), Message (String), [Loglevel (String, "INFO"), [Data (Object|List of Objects)]]]
	 */
	var LOGLEVELS = {ERROR: 0, WARNING: 5, INFO: 10, DEBUG: 15}
	var log = clazz.log = function(arg0, arg1, arg2, arg3){
		var className = ((typeof clazz.name != "undefined") ? clazz.name : "IE,really?");
		var instance = "";
		var message = "";
		var logLevel = LOGLEVELS.INFO;
		var data = [];

		if(arg0 instanceof clazz){
			instance = " #" + arg0.state.instanceNo + " '" + arg0.state.instanceName +"'";
			message = arg1;
			logLevel = (typeof arg2 != "undefined") ? LOGLEVELS[arg2] : LOGLEVELS.INFO;
			data = ((typeof arg3 != "undefined")? ((arg3 instanceof Array)? arg3 : [arg3]) : []);
		}else{
			message = arg0;
			logLevel = (typeof arg1 != "undefined") ? LOGLEVELS[arg1] : LOGLEVELS.INFO;
			data = ((typeof arg2 != "undefined")? ((arg2 instanceof Array)? arg2 : [arg2]) : []);
		}

		if(logLevel == LOGLEVELS.DEBUG)    var logF = function(data){console.log(data);}
		if(logLevel == LOGLEVELS.INFO)     var logF = function(data){console.info(data);}
		if(logLevel == LOGLEVELS.WARNING)  var logF = function(data){console.warn(data);}
		if(logLevel == LOGLEVELS.ERROR)    var logF = function(data){console.error(data);}

		logF(className + instance + ": " + message);
		if(data.length != 0){
			console.groupCollapsed != undefined && data.length > 1 && console.groupCollapsed();
			for(var i=0; i<data.length; i++){
				logF(data[i]);
			}
			console.groupEnd != undefined && data.length > 1 &&  console.groupEnd();
		}
	}

	/*
	 * Registers an instance so that it can be accessed with `getInstance`
	 */
	var registerInstance = clazz.registerInstance = function(instanceName, instanceNo, instance){
		clazz.instancesString[instanceName] = instance;
		clazz.instancesNumber[instanceNo]   = instance;
		clazz.instances.push(instance);
		log("registered new textAreaCMEditor instance #" + instanceNo + " '" + instanceName + "'", "INFO");
	}

	/*
	 * Returns an instance of this class
	 *
	 * Parameters: identifier (String|Number): the instance name or number
	 */
	 var getInstance = clazz.getInstance = function(identifier){
		if(typeof identifier == "number")
			return clazz.instancesNumber[identifier];
		else
			return clazz.instancesString[identifier];
	}

	/*
	 * Returns all instances of this class
	 */
	 var getInstances = clazz.getInstances = function(){
		return clazz.instances;
	}


	/*
	 * Loads a theme if it is not yet loaded, then calls a callback. Requires the static
	 * property "themeBaseURL" to be set correctly
	 *
	 * Parameters: themeName String: the theme's name
	 *             callback Function: called when resource was loaded successfully or is already available
	 */
	var loadTheme = clazz.loadTheme = function(themeName, callback){
		if(clazz.themeBaseURL === undefined){
			log("Could not load theme. Please set the themeBaseURL", "WARNING");
			return;
		}

		if(themeName == "default"){
			if(callback !== undefined) callback();
			return;
		}
		$.ajax(clazz.themeBaseURL+themeName+".css")
			.done(function(data){
				$("head").append("<style>" + data + "</style>");

				//use CMEditor instead of clazz to avoid loading themes twice
				CMEditor.loadedResources.push(location);

				if(callback !== undefined)
					callback();
			})
			.fail(function(){
				log("Could not load the resource at "+location, "WARNING");
			});
	}

	/*
	 * Loads a mode if it is not yet loaded, then calls a callback. Requires the static
	 * property "modeBaseURL" to be set correctly
	 *
	 * Parameters: modeName String: the mode's name
	 *             callback Function: called when resource was loaded successfully or is already available
	 */
	var loadMode = clazz.loadMode = function(modeName, callback){
		if(clazz.modeBaseURL === undefined){
			log("Could not load mode. Please set the modeBaseURL", "WARNING");
			return;
		}

		CodeMirror.modeURL = clazz.modeBaseURL+"%N/%N.js"
		CodeMirror.requireMode(modeName, callback);
	}

	/*
	 * Can be used to register callbacks for events statically (i.e. for all instances)
	 *
	 * Events in CMEditor which can be set only statically:
	 *
	 *     preMenuInit: Fired before the menu of this CMEditor is initiated, i.e. before its constructor is called
	 *                  Your callback will be called in the context of the menu's root element
	 *     postMenuInit: Fired after the menu of this CMEditor is initiated, i.e. after its constructor has been called
	 *                  Your callback will be called in the context of the menu's root element and passed the menu object as first
	 *                  argument
	 *     preInitialization: Fired inside the constructor of the CMEditor, after a minimal state of the object was created
	 *                  Your callback will be called in the context of the CMEditor to be created and it will be passed the same arguments
	 *                  as the constructor (the rootElement, the options and the instance name)
	 *     postInitialization: Fired inside the constructor of the CMEditor, after any other instruction was executed (right before return)
	 *                  Your callback will be called in the context of the CMEditor to be created and it will be passed the same arguments
	 *                  as the constructor (the rootElement, the options and the instance name)
	 *
	 * Parameters: eventName String: the event's name as mentioned above
	 *             hook Function: the function to call
	 *             nameFilter String (optional): execute only for instances whose name matches this String
	 *
	 */
	var staticOn = clazz.on = function(eventName, hook, nameFilter){
		if(typeof nameFilter === "undefined"){
			if(typeof clazz.eventHooks[eventName] === "undefined")
				clazz.eventHooks[eventName] = [];

			clazz.eventHooks[eventName].push(hook);
		}else{
			if(typeof clazz.filteredEventHooks[nameFilter] === "undefined")
				clazz.filteredEventHooks[nameFilter] = {};

			if(typeof clazz.filteredEventHooks[nameFilter][eventName] === "undefined")
				clazz.filteredEventHooks[nameFilter][eventName] = [];

			clazz.filteredEventHooks[nameFilter][eventName].push(hook);
		}
	}

	/*************************************************************************
	 *                    Begin 'private' methods                            *
	 *************************************************************************/

	/*
	 * Executes all hooks that were registered using `on` on `eventName`, either per-instance or on all
	 * instances using `textAreaCMEditor.on`
	 *
	 * Parameters: eventName String: the event of which all hooks should be called
	 *             context Object: the object that `this` should be set to in the hook
	 *             args Array: the parameters to pass to the hook as an array
	 */
	function executeHooks(self, eventName, context, args){
		for(var i=0; self.state && self.state.eventHooks[eventName] && i<self.state.eventHooks[eventName].length; i++){
			if(typeof self.state.eventHooks[eventName][i] === "function")
				self.state.eventHooks[eventName][i].apply(context, args);
			else
				log(self, "A hook was not executed because it is not a function", "WARNING");
		}

		for(var i=0; clazz.eventHooks[eventName] && i<clazz.eventHooks[eventName].length; i++){
			if(typeof clazz.eventHooks[eventName][i] === "function")
				clazz.eventHooks[eventName][i].apply(context, args);
			else
				log(self, "A hook was not executed because it is not a function", "WARNING");
		}

		if(clazz.filteredEventHooks[self.state.instanceName] !== undefined){
			for(var i=0; clazz.filteredEventHooks[self.state.instanceName][eventName] && i<clazz.filteredEventHooks[self.state.instanceName][eventName].length; i++){
				if(typeof clazz.filteredEventHooks[self.state.instanceName][eventName][i] === "function")
					clazz.filteredEventHooks[self.state.instanceName][eventName][i].apply(context, args);
				else
					log(self, "A hook was not executed because it is not a function", "WARNING");
			}
		}
	}

	function init(self, rootElem, options) {
		var keyMap = {
			"Ctrl-Space": "autocomplete",
			"Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); },
			"Alt-Up": function(cm) { cmeditorbase_moveUp(cm); },
			"Alt-Down": function(cm) { cmeditorbase_moveDown(cm); },
			"Ctrl-7": function(cm) { cmeditorbase_comment(cm); },
		};

		if (typeof self.options.overlayDefinitionsVar !== 'undefined') {
			for(var name in self.options.overlayDefinitionsVar) {
				cmeditorall_add_overlay_definition(name, self.options.overlayDefinitionsVar[name]['baseMode'], self.options.overlayDefinitionsVar[name]['definition']);
			}
			CodeMirror.commands.autocomplete = function(cm, getHints, options) { CodeMirror.showHint(cm, null, {cmeditorDefinitions: self.options.overlayDefinitionsVar}) };
		}

		var codeMirrorOptions = {
			lineNumbers: true,
			smartIndent: false,
			lineWrapping: true,
			matchBrackets: true,
			autoCloseBrackets: true,
			autoCloseTags: true,
			//cursorHeight: 1.0,
			viewportMargin: Infinity,
			foldGutter: true,
			gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
			extraKeys: keyMap,
		}

		if(options.mode){
			codeMirrorOptions.mode = options.mode;
			setMode(self, options.mode);
		}
		if(options.defaultReadOnly || options.readOnly)
			codeMirrorOptions.readOnly = 'nocursor';

		var codeMirror = self.codeMirror = CodeMirror.fromTextArea(rootElem.find("textarea")[0], codeMirrorOptions);

		if(self.options.useSession){
			if (localStorage['cmeditor-menu-binding'])
				codeMirror.setOption("keymap", localStorage['cmeditor-menu-binding']);
			else
				codeMirror.setOption("keymap", "default");

			if (localStorage['cmeditor-menu-theme']){
				loadTheme(localStorage["cmeditor-menu-theme"], function(){codeMirror.setOption("theme", localStorage["cmeditor-menu-theme"]); copyCMTheme(self);});
			}else
				codeMirror.setOption("theme", "default");
		}else{
			codeMirror.setOption("keymap", self.options.binding);
			codeMirror.setOption("theme", self.options.theme);
		}

		if (codeMirror.getOption("keymap") == 'vim') {
			codeMirror.setOption("vimMode", true);
		} else {
			codeMirror.setOption("vimMode", false);
		}
	}

	/*
	 * Loads all modules in options.availableThemes and options.availableModes
	 */
	function preloadModules(self){
		for(var i=0; i<self.options.availableThemes.length; i++){
			loadTheme(self.options.availableThemes[i]);
		}
		for(var i=0; i<self.options.availableModes.length; i++){
			loadMode(self.options.availableModes[i]);
		}
	}

	/*************************************************************************
	 *                    Begin 'public' methods                             *
	 *************************************************************************/

	/* (Public)
	 * Sets the code mirror theme and copies some styles to the CMEditor to match the theme as closely as possible
	 */
	function copyCMTheme(self){
		var id = self.rootElem.attr("id");
		var style = self.rootElem.children("style").eq(0);
		style.text("");

		function copyCSS(fromSelector, targetSelector, propertyName, targetPropertyName){
			var target =  "#" + id + (targetSelector!=null ? " " + targetSelector : "");
			if(targetPropertyName == undefined)
				targetPropertyName = propertyName;

			style.text(style.text()+"\n"+target+"{"+targetPropertyName+":"+self.rootElem.find(fromSelector).css(propertyName)+"}");
		}

		copyCSS(".CodeMirror-gutters", null, "background-color");
		copyCSS(".CodeMirror-linenumber", null, "color");
		copyCSS(".CodeMirror", "input", "color");
		copyCSS(".CodeMirror", "input", "background-color");

		copyCSS(".CodeMirror-gutters", "ul.tabs li", "border-right-color", "border-color");
		copyCSS(".CodeMirror-gutters", "ul.tabs li", "border-right-width", "border-width");
		style.text(style.text()+"\n #"+id+" ul.tabs li {border-bottom-width: 0px}");
		copyCSS(".CodeMirror", "ul.tabs li", "background-color");
		copyCSS(".CodeMirror", "ul.tabs li", "color");
	}

	/* (Public)
	 *
	 * Sets focus to the text editor
	 */
	function focus(self){
		self.codeMirror.focus();
	}

	/* (Public)
	 *
	 * Returns the underlying codeMirror instance
	 */
	function getCodeMirror(self){
		return self.codeMirror;
	}

	/* (Public)
	 *
	 * Returns the current mode
	 */
	function getCurrentCMEditorMode(self){
		return self.codeMirror.getOption("mode");
	}

	/* (Public)
	 * Returns whether the whole editor is read only
	 */
	function isReadOnly(self){
		return self.options.readOnly
	}

	/* (Public)
	 *
	 * Can be used to register callbacks for events.
	 *
	 * Currently there are no instance events available in textAreaCMEditor.
	 * You can set some statically via textAreaCMEditor.on, though
	 *
	 */
	function on(self, eventName, hook){
		if(self.state.eventHooks[eventName] === undefined)
			self.state.eventHooks[eventName] = [];

		self.state.eventHooks[eventName].push(hook);
	}


	/* (Public)
	 * Sets the mode (CM lingo for filetype) of the current document; triggers loading the mode
	 * first if necessary
	 *
	 * Parameters: mode (String): The name of the mode to set
	 */
	function setMode(self, mode){
		var cmMode = CodeMirror.findModeByName(mode) || CodeMirror.findModeByMIME(mode);

		if(cmMode === null || cmMode === undefined){
			log(self, "Could not load this unknown mode: "+mode, "WARNING");
			displayMessage(self, "Unknown mode");
			return;
		}

		loadMode(cmMode.mode, function(){self.codeMirror.setOption("mode", cmMode.mime); self.menu.update(self);});
	}


	/* (Public)
	 * Enters or leaves fullscreen mode
	 */
	function toggleFullscreen(self){
		if(self.state.instanceName == ""){
			return;
		}

		if(self.state.cssBeforeFullscreen == undefined){
			self.state.cssBeforeFullscreen = {"position": self.rootElem.css("position"),
			                                  "top":  self.rootElem.css("top"),
			                                  "left":  self.rootElem.css("left"),
			                                  "height":  self.rootElem.css("height"),
			                                  "width":  self.rootElem.css("width")};
			self.state.oldDocumentOverflow = document.documentElement.style.overflow;
			document.documentElement.style.overflow = "hidden";
			self.rootElem.css({"position": "fixed", "top": "0", "left": "0", "height": "100%", "width": "100%"});
			self.rootElem.addClass("cmeditor-fullscreen");

			self.layout = self.rootElem.layout({
					center__paneSelector: "#cmeditor-"+self.state.instanceName+"-centerpane",
					north__paneSelector:  "#cmeditor-"+self.state.instanceName+"-northernpane",
					north__size: 75,
					north__resizable:false
					});

			self.codeMirror.refresh();

		}else{

			self.layout.destroy();

			self.rootElem.removeClass("cmeditor-fullscreen");
			self.rootElem.css(self.state.cssBeforeFullscreen);
			document.documentElement.style.overflow = self.state.oldDocumentOverflow;
			self.state.cssBeforeFullscreen = undefined;

			self.codeMirror.refresh();
		}
	}

	/* (Public)
	 *
	 * Logs its call to the console
	 */
	function update(self) {
		if(typeof self.menu !== "undefined")
			self.menu.update();
	}

	textAreaCMEditor.prototype.constructor = textAreaCMEditor;

	//Zugegriffen aus Menu
	textAreaCMEditor.prototype.copyCMTheme   = function(){Array.prototype.unshift.call(arguments, this); return copyCMTheme.apply(this, arguments)};
	textAreaCMEditor.prototype.focus         = function(){Array.prototype.unshift.call(arguments, this); return focus.apply(this, arguments)};
	textAreaCMEditor.prototype.isReadOnly    = function(){Array.prototype.unshift.call(arguments, this); return isReadOnly.apply(this, arguments)};
	textAreaCMEditor.prototype.update        = function(){Array.prototype.unshift.call(arguments, this); return update.apply(this, arguments)};
	textAreaCMEditor.prototype.getCodeMirror = function(){Array.prototype.unshift.call(arguments, this); return getCodeMirror.apply(this, arguments)};
	textAreaCMEditor.prototype.getCurrentCMEditorMode = function(){Array.prototype.unshift.call(arguments, this); return getCurrentCMEditorMode.apply(this, arguments)};
	textAreaCMEditor.prototype.setMode        = function(){Array.prototype.unshift.call(arguments, this); return setMode.apply(this, arguments)};
	textAreaCMEditor.prototype.toggleFullscreen = function(){Array.prototype.unshift.call(arguments, this); return toggleFullscreen.apply(this, arguments)};

	return textAreaCMEditor;

}();
