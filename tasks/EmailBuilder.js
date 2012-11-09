/*
 * grunt-EmailBuilder
 * https://github.com/yargalot/Email-Builder
 *
 * Copyright (c) 2012 Steven Miller
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  // Please see the grunt documentation for more information regarding task and
  // helper creation: https://github.com/gruntjs/grunt/blob/master/docs/toc.md

  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerTask('EmailBuilder', 'Your task description goes here.', function() {
    grunt.log.write(grunt.helper('EmailBuilder'));

    var juice = require('juice'),
        http = require('http'),
        builder = require('xmlbuilder'),
        util = require('util'),
        jsdom = require('jsdom'),
        _ = require('underscore');

    var helpers = require('grunt-lib-contrib').init(grunt),
        options = helpers.options(this),
        files = grunt.config('EmailBuilder.files'),
        done = this.async();

    // For each of the files
    _.each(files, function(css, html) {

      var doc = grunt.file.read(html), // HTML
          inline = grunt.file.read(css), // CSS to be inlined
          output = juice(doc, inline);

      //console.log(output);

      // Make directory for email, put file up in t'hur
      grunt.file.write('email.html', output);


      // If a second Css file is provided this will be added in as a style tag.
      if(css[1])
        var style = grunt.file.read(css[1], 'utf8');

      // Js dom - Might use this to sniff out the style pathways for css. Gets title atm
      var document = jsdom.html(output),
          window = document.createWindow(),
          date = String(Math.round(new Date().getTime() / 1000)),
          title = document.title+' '+date;

      sendLitmus(output, title);
    });

    function sendLitmus(data, title) {
      // Write the data xml file to curl, prolly can get rid of this somehow.

      var xml = xmlBuild(data, title);
      grunt.file.write('data.xml', xml);

      var username = options.litmus.username,
          password = options.litmus.password,
          accountUrl = options.litmus.url;

      var httpOptions = {
        host : accountUrl,
        path: '/emails.xml',
        auth : username+':'+password,
        method: 'POST',
        headers : {
          'Accept' :'application/xml\'' ,
          'Content-Type': 'application/xml\'',
          'Content-Length': xml.length
        }
      }
      console.log(options);
      console.log(httpOptions);

      var req = http.request(httpOptions, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          console.log('BODY: ' + chunk);
          done();
        });
      });

      req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        done(false);
      });

      req.write(xml);
      req.end();

      /*
      var command = 'curl -i -X POST -u '+username+':'+password+' -H \'Accept: application/xml\' -H \'Content-Type: application/xml\' '+accountUrl+' -d @data.xml';

      grunt.helper('exec', command, function(error, stdout, stderr) {
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);

        if(error !== null) console.log('exec error: ' + error);
      });
      */
    }

    //Application XMl Builder
    function xmlBuild(data, title) {
      var xmlApplications = builder.create('applications').att('type', 'array');

      // Need underscore for this shit, for loops are dumb
      _.each(options.litmus.applications, function(app) {
        var item = xmlApplications.ele('application');
        item.ele('code', app);
      })

      //Build Xml to send off, Join with Application XMl
      var xml = builder.create('test_set')
        .importXMLBuilder(xmlApplications)
        .ele('save_defaults', 'false').up()
        .ele('use_defaults', 'false').up()
        .ele('email_source')
          .ele('body').dat(data).up()
          .ele('subject', title)
        .end({pretty: true});

      //console.log(xml);
      return xml;
    }

  });

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  grunt.registerHelper('EmailBuilder', function() {
    return 'EmailBuilder!!!';
  });

  var cm = require('child_process').exec;
  grunt.registerHelper('exec', function(command, callback) {

    console.log(command);
    cm(command, function(err, stdout, stderr) {

      if (err || stderr) { callback(err || stderr, stdout); return; }

      callback(null, stdout);
    });
  });

};
