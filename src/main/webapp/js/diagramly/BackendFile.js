// $Id = BackendFile.js,v 1.12 2010-01-02 09 =45 =14 gaudenz Exp $
// Copyright (c) 2006-2014, JGraph Ltd
/**
 * Copy from LocalFile.js
 * Constructs a new point for the optional x and y coordinates. If no
 * coordinates are given, then the default values for <x> and <y> are used.
 * @constructor
 * @class Implements a basic 2D point. Known subclassers = {@link mxRectangle}.
 * @param {number} x X-coordinate of the point.
 * @param {number} y Y-coordinate of the point.
 */
 BackendFile = function(idToken, ui, data, pollInterval)
 {
     DrawioFile.call(this, ui, data);
     
     const idx = idToken.indexOf('|');
     this.token = idToken.substring(idx + 1);

     const endpoint = idToken.substring(0, idx);
     // Ensure the URI is absolute
     this.endpoint =
            !endpoint.startsWith('/') &&
            !endpoint.startsWith('http:') &&
            !endpoint.startsWith('https:')
                ? `/${endpoint}`
                : endpoint;

     if (pollInterval > 0) {
        this.pollIntervalId = setInterval(() => this.poll(), pollInterval);
        window.addEventListener('unload', () => {
            this.stopPoll();
            if (this.ui.editor.modified) {
                this.save();
            }
        });
     }

     this.desc = null;
     this.mode = App.MODE_BACKEND;
 };
 
 //Extends mxEventSource
 mxUtils.extend(BackendFile, DrawioFile);
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.isAutosave = function()
 {
     return true;
 };
 
 /**
  * Specifies if the autosave checkbox should be shown in the document
  * properties dialog. Default is false.
  */
 BackendFile.prototype.isAutosaveOptional = function()
 {
     return false;
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.getMode = function()
 {
     return this.mode;
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.getTitle = function()
 {
     return '';
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.isRenamable = function()
 {
     return false;
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.save = function(revision, success, error)
 {
     this.saveAs('', success, error);
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.saveAs = function(title, success, error)
 {
     this.saveFile(title, false, success, error);
 };
 
 /**
  * Adds all listeners.
  */
 BackendFile.prototype.getDescriptor = function()
 {
     return this.desc;
 };
 
 /**
 * Updates the descriptor of this file with the one from the given file.
 */
 BackendFile.prototype.setDescriptor = function(desc)
 {
     this.desc = desc;
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.getLatestVersion = function(success, error)
 {
     this.getFromAPI(success, error);
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.saveFile = function(title, revision, success, error, useCurrentData)
 {
     // Updates data after changing file name
     if (!useCurrentData)
     {
         this.updateFileData();
     }
     
     this.setShadowModified(false);

     var done = mxUtils.bind(this, function()
     {
         this.setModified(this.getShadowModified());
         this.contentChanged();
         
         if (success != null)
         {
             success();
         }
     });

     this.postToAPI(this.getData(), (savedData) => {
        this.fileSaved(savedData, this.desc, done, error);
     }, error);
 };
 
 /**
  * Translates this point by the given vector.
  * 
  * @param {number} dx X-coordinate of the translation.
  * @param {number} dy Y-coordinate of the translation.
  */
 BackendFile.prototype.rename = function(title, success, error)
 {
     if (error != null)
     {
         error({e: new Error('Rename is not supported')});
     }
 };

 BackendFile.prototype.poll = function()
 {
     this.getFromAPI((resp) => {
        this.setData(resp);
        this.ui.setFileData(resp);
     }, (e) => {
        this.ui.handleError(e, mxResources.get('errorLoadingFile'));
     })
 }
 
 /**
  * Returns the location as a new object.
  * @type mx.Point
  */
 BackendFile.prototype.open = function()
 {
    this.getFromAPI((resp) => {
        this.setData(resp);
        this.ui.setFileData(resp);
        this.installListeners();
        DrawioFile.SYNC = 'auto';
        this.startSync();
    }, (e) => {
        this.ui.handleError(e, mxResources.get('errorLoadingFile'));
    });
 };

 BackendFile.prototype.stopPoll = function() {
     if (this.pollIntervalId > 0) {
         clearInterval(this.pollIntervalId);
         this.pollIntervalId = -1;
     }
 }

 BackendFile.prototype.destroy = function() {
     this.stopPoll();
     DrawioFile.prototype.destroy.call(this);
 }

 BackendFile.prototype.getFromAPI = function(success, error)
 {
    const opts = {
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + this.token
        }
    };

    axios.get(this.endpoint, opts).then((resp) => success(resp.data.xml ? resp.data.xml : this.ui.emptyDiagramXml), error);
 };
 
 BackendFile.prototype.postToAPI = function(xml, success, error)
 {
    const opts = {
        headers: {
            'Authorization': 'Bearer ' + this.token,
            'Content-Type': 'application/json'
        }
    };

    axios.patch(this.endpoint, { xml }, opts).then((resp) => success(resp.data.xml), error);
 };
