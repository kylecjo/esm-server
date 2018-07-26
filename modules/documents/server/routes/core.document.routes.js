/*eslint-disable*/
'use strict';
// =========================================================================
//
// Routes for Documents
//
// Does not use the normal crud routes, mostly special sauce
//
// =========================================================================
var DocumentClass = require ('../controllers/core.document.controller');
var routes 		= require ('../../../core/server/controllers/core.routes.controller');
var policy 		= require ('../../../core/server/controllers/core.policy.controller');
var fs 			= require('fs');
var minio = require('minio');

var minioClient = new minio.Client({
  endPoint: 'play.minio.io',
  port: 9000,
  secure: true,
  accessKey: 'Q3AM3UQ867SPQQA43P2F',
  secretKey: 'zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG'
});

var renderNotFound = function (url, res) {
  res.status(404).format({
    'text/html': function () {
      res.render('modules/core/server/views/404', {
        url: url
      });
    },
    'application/json': function () {
      res.json({
        error: 'Path not found'
      });
    },
    'default': function () {
      res.send('Path not found');
    }
  });
};

module.exports = function (app) {
  //
  // get put new delete
  //
  routes.setCRUDRoutes (app, 'document', DocumentClass, policy, ['get','put','new', 'delete', 'query'], {all:'guest',get:'guest'});
  // Import via CSV
  app.route ('/api/documents/import')
    .all (policy ('guest'))
    .post ( routes.setAndRun (DocumentClass, function (model, request) {
      return model.loadDocuments(request.files.file, request);
    }));
  app.route ('/api/document/makeLatest/:document')
    .all (policy ('user'))
    .put (routes.setAndRun (DocumentClass, function (model, req) {
      return model.makeLatest (req.Document);
    }));
  //
  // getAllDocuments                 : '/api/documents'
  //
  app.route ('/api/documents')
    .all (policy ('guest'))
    .get (routes.setAndRun (DocumentClass, function (model/* , req */) {
      return model.list ();
    }));
  //
  // getProjectDocuments             : '/api/documents/' + projectId
  //
  app.route ('/api/documents/:projectid')
    .all (policy ('guest'))
    .get (routes.setAndRun (DocumentClass, function (model, req) {
      return model.getDocumentsForProject (req.params.projectid, req.headers.reviewdocsonly);
    }));
  app.route ('/api/documents/for/project/:projectid/in/:directoryid/sort')
    .all (policy ('guest'))
    .put (routes.setAndRun (DocumentClass, function (model, req) {
      return model.sortDocumentsForProjectFolder (req.params.projectid, req.params.directoryid, req.body);
    }));
  //
  // getProjectDocumentTypes         : '/api/documents/types/' + projectId
  //
  app.route ('/api/documents/types/:projectid')
    .all (policy ('guest'))
    .get (routes.setAndRun (DocumentClass, function (model, req) {
      return model.getDocumentTypesForProject (req.params.projectid, req.headers.reviewdocsonly);
    }));
  //
  // getProjectDocumentSubTypes      : '/api/documents/subtypes/' + projectId
  //
  app.route ('/api/documents/subtypes/:projectid')
    .all (policy ('guest'))
    .get (routes.setAndRun (DocumentClass, function (model, req) {
      return model.getDocumentSubTypesForProject (req.params.projectid);
    }));
  //
  // getProjectDocumentFolderNames   : '/api/documents/folderNames/' + projectId
  //
  app.route ('/api/documents/folderNames/:projectid')
    .all (policy ('guest'))
    .get (routes.setAndRun (DocumentClass, function (model, req) {
      return model.getDocumentFolderNamesForProject (req.params.projectid);
    }));
  //
  // getProjectDocumentFolderNames (for MEM)   : '/api/documents/memtypes/' + projectId
  //
  app.route ('/api/documents/memtypes/:projectid')
    .all (policy ('guest'))
    .get (routes.setAndRun (DocumentClass, function (model, req) {
      return model.getDocumentTypesForProjectMEM (req.params.projectid);
    }));
  //
  // getProjectDocumentVersions      : '/api/documents/versions/' + projectId
  //
  app.route ('/api/documents/versions/:document')
    .all (policy ('guest'))
    .get (routes.setAndRun (DocumentClass, function (model, req) {
      return model.getDocumentVersions (req.Document);
    }));
  //
  // getDocumentsInList              : '/api/documentlist', data:documentList
  //
  app.route ('/api/documentlist')
    .all (policy ('guest'))
    .put (routes.setAndRun (DocumentClass, function (model, req) {
      return model.getList (req.body);
    }));
  //
  // fetch a document (download multipart stream)
  //
  app.route ('/api/document/:document/download')
    .all (policy ('guest'))
    .get (function (req, res) {
      if (req.Document.internalURL.match (/^(http|ftp)/)) {
        res.redirect (req.Document.internalURL);
      } else {
        var name = documentDownloadName(req);

        if (fs.existsSync(req.Document.internalURL)) {
          routes.streamFile (res, {
            file : req.Document.internalURL,
            name : name,
            mime : req.Document.internalMime
          });
        } else {
          renderNotFound(req.originalUrl, res);
        }
      }
    });
  function documentDownloadName(req) {
    // ETL fixing - if the name was brought in without a filename, and we have their document
    // file format, affix the type as an extension to the original name so they have a better
    // chance and opening up the file on double-click.
    String.prototype.endsWith = String.prototype.endsWith || function (str){
      return new RegExp(str + "$").test(str);
    };

    var doc = req.Document;
    var format = req.Document.documentFileFormat;
    var name = doc.documentFileName || doc.displayName || doc.internalOriginalName;
    if (format && !name.endsWith(format)) {
      name += "." + format;
    }
    // keep the console log statments until after we run an ETL that resets the filename extensions.
    // these will help verify the ETL once it is done
    // They may help in the future if those file extensions disappear again.
    return name;
  }
  //
  // fetch a document (download multipart stream)
  //
  app.route ('/api/document/:document/fetch')
    .all (policy ('guest'))
    .get (function (req, res) {
      if (req.Document.internalURL.match (/^(http|ftp)/)) {
        res.redirect (req.Document.internalURL);
      } else {

        var name = documentDownloadName(req);

        if (fs.existsSync(req.Document.internalURL)) {
          var stream 	= fs.createReadStream(req.Document.internalURL);
          var stat 	= fs.statSync(req.Document.internalURL);
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-Type', req.Document.internalMime);
          res.setHeader('Content-Disposition', 'inline;filename="' + name + '"');
          stream.pipe(res);
        } else {
          renderNotFound(req.originalUrl, res);
        }
      }
    });
  //
  // upload comment document:  We do this to force the model as opposed to trusting the
  // 'headers' from an untrustworthy client.
  //
  app.route ('/api/commentdocument/:project/upload')
    .all (policy ('guest'))
    .post (routes.setAndRun (DocumentClass, function (model, req) {
      return new Promise (function (resolve, reject) {
        var file = req.files.file;
        if (file) {
          var opts = { oldPath: file.path, projectCode: req.Project.code};
          routes.moveFile (opts)
            .then (function (newFilePath) {
              return model.create ({
                // TODO during a refactor sprint... use the defineModel function defined below
                // Metadata related to this specific document that has been uploaded.
                // See the document.model.js for descriptions of the parameters to supply.
                project                 : req.Project,
                //projectID             : req.Project._id,
                projectFolderType       : req.body.documenttype,//req.body.projectfoldertype,
                projectFolderSubType    : req.body.documentsubtype,//req.body.projectfoldersubtype,
                projectFolderName       : req.body.documentfoldername,
                projectFolderURL        : newFilePath,
                projectFolderDatePosted : Date.now(),
                // NB                   : In EPIC, projectFolders have authors, not the actual documents.
                projectFolderAuthor     : req.body.projectfolderauthor,
                // These are the data as it was shown on the EPIC website.
                documentAuthor          : req.body.documentauthor,
                documentFileName        : req.body.documentfilename,
                documentFileURL         : req.body.documentfileurl,
                documentFileSize        : req.body.documentfilesize,
                documentFileFormat      : req.body.documentfileformat,
                documentIsInReview      : req.body.documentisinreview,
                documentVersion         : 0,
                documentSource			: 'COMMENT',
                // These are automatic as it actually is when it comes into our system
                internalURL             : newFilePath,
                internalOriginalName    : file.originalname,
                internalName            : file.name,
                internalMime            : file.mimetype,
                internalExt             : file.extension,
                internalSize            : file.size,
                internalEncoding        : file.encoding,
                directoryID             : req.body.directoryid || 0
              });
            })
            .then (resolve, reject);
        }
        else {
          reject ("no file to upload");
        }
      });
    }));
  //
  // upload document
  //
  app.route ('/api/document/:project/upload').all (policy ('guest'))
    .post (routes.setAndRun (DocumentClass, function (model, req) {
      return new Promise (function (resolve, reject) {
        var file = req.files.file;
        if (file && file.originalname === 'this-is-a-file-that-we-want-to-fail.xxx') {
          reject('Fail uploading this file.');
        } else if (file) {
          console.log('file: ', file); //eslint-disable-line
          var opts = { oldPath: file.path, projectCode: req.Project.code};
          console.log('opts: ', opts);
          routes.moveFile (opts)
            .then (function (newFilePath) {
              console.log(newFilePath);
              var readPermissions = null;
              if (req.headers.internaldocument) {
                // Force read array to be this:
                readPermissions = ['project-admin', 'system-eao', 'project-team', 'project-intake', 'project-system-admin'];
              }
              var datePosted, dateReceived = Date.now();
              // Allow override of date posting/received
              if (req.headers.dateposted) {
                datePosted = new Date(req.headers.dateposted);
              }
              if (req.headers.datereceived) {
                dateReceived = new Date(req.headers.datereceived);
              }
              var objectName = opts.projectCode + '/' + file.name;
              minioClient.fPutObject('test-bucket', objectName, newFilePath, file, function(err, etag){
                return console.log(err,etag);
              })
              var newModel = model.create ({
                // TODO during a refactor sprint... use the defineModel function defined below
                // Metadata related to this specific document that has been uploaded.
                // See the document.model.js for descriptions of the parameters to supply.
                project                 : req.Project,
                projectFolderType       : req.body.documenttype,
                projectFolderSubType    : req.body.documentsubtype,
                projectFolderName       : req.body.documentfoldername,
                projectFolderURL        : newFilePath,
                datePosted 				: datePosted,
                dateReceived 			: dateReceived,

                // Migrated from old EPIC
                oldData            		: req.body.olddata,

                // NB                   : In EPIC, projectFolders have authors, not the actual documents.
                projectFolderAuthor     : req.body.projectfolderauthor,
                // These are the data as it was shown on the EPIC website.
                documentEPICProjectId 	: req.body.documentepicprojectid,
                documentAuthor          : req.body.documentauthor,
                documentFileName        : req.body.documentfilename,
                documentFileURL         : req.body.documentfileurl,
                documentFileSize        : req.body.documentfilesize,
                documentFileFormat      : req.body.documentfileformat,
                documentIsInReview      : req.body.documentisinreview,
                documentVersion         : 0,
                // These are automatic as it actually is when it comes into our system
                internalURL             : newFilePath,
                internalOriginalName    : file.originalname,
                internalName            : file.name,
                internalMime            : file.mimetype,
                internalExt             : file.extension,
                internalSize            : file.size,
                internalEncoding        : file.encoding,
                directoryID             : req.body.directoryid || 0,
                displayName             : req.body.displayname || req.body.documentfilename || file.originalname,
                dateUploaded            : req.body.dateuploaded
              }, req.headers.inheritmodelpermissionid, readPermissions);
              // console.log(newModel);
              return newModel;
            })
            .then(function (d) {

              if (req.headers.publishafterupload === 'true') {
                return model.publish(d);
              } else {
                return d;
              }
            })
            .then (resolve, reject);
        }
        else {
          reject ("no file to upload");
        }
      });
    }));

  app.route('/api/publish/document/:document').all(policy('user'))
    .put(routes.setAndRun(DocumentClass, function (model, req) {
      return model.publish(req.Document);
    }));
  app.route('/api/unpublish/document/:document').all(policy('user'))
    .put(routes.setAndRun(DocumentClass, function (model, req) {
      return model.unpublish(req.Document);
    }));
  app.route('/api/getDocumentByEpicURL').all(policy('guest'))
    .put(routes.setAndRun(DocumentClass, function (model, req) {
      return model.getEpicProjectFolderURL(req.body);
    }));
};
