/*
 * grunt-EmailBuilder
 * https://github.com/yargalot/Email-Builder
 *
 * Copyright (c) 2013 Steven Miller
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  // Please see the grunt documentation for more information regarding task and
  // helper creation: https://github.com/gruntjs/grunt/blob/master/docs/toc.md

  // ==========================================================================
  // TASKS
  // ==========================================================================

  // Task Desciption
  var task_name         = 'emailBuilder';
  var task_description  = 'Compile Files';


  // Required modules
  var juice     = require('juice');
  var builder   = require('xmlbuilder');
  var less      = require('less');
  var jade      = require('jade');
  var path      = require('path');
  var cheerio   = require('cheerio');
  var _         = require('lodash');
  var async     = require('async');


  grunt.registerMultiTask(task_name, task_description, function() {

    var options   = this.options();
    var basepath  = options.basepath;
    var done      = this.async();

    async.forEachSeries(this.files, function(file, next) {

      var data      = grunt.file.read(file.src);
      var basename  = path.basename(file.src,  '.html');
      var basepath  = process.cwd();

      // jade compile
      if ( path.extname(file.src) === '.jade') {
        data = renderJade(data, file.src);
      }

      var $           = cheerio.load(data);
      var date        = grunt.template.today('yyyy-mm-dd');
      var title       = $('title').text() + date;
      var srcFiles    = [];
      var embeddedCss = '';
      var extCss;

      // External stylesheet
      $('link').each(function (i, elem) {

        if (!$(this).attr('data-placement')) return;

        var target = $(this).attr('href');
        var map = {
          file    : target,
          inline  : $(this).attr('data-placement') === 'style-tag' ? false : true
        };

        srcFiles.push(map);

        $(this).remove();
      });

      // Embedded Stylesheet. Will ignore style tags with data-ignore attribute
      $('style').each(function(i, element){
        if(!$(this).attr('data-ignore')){
          embeddedCss += $(this).text();
          $(this).remove();
        }
      });

      // Set to target file path to get css
      grunt.file.setBase(path.dirname(file.src));

      // Less Compilation
      async.forEachSeries(srcFiles, function(srcFile, nextFile) {
        var _that = $(this);

        if (srcFile.inline) {
          renderCss(srcFile.file, function(data) {
            extCss = data;
            nextFile();
          });
        } else {

          renderCss(srcFile.file, function(data) {
            $('head').append('<style>' + data + '</style>');
            nextFile();
          });
        }
      }, function(err) {

        if(err) grunt.log.error(err);
        
        var html = $.html();
        var allCss = embeddedCss + extCss;
        var output = allCss ? juice.inlineContent(html, allCss) : html;

        grunt.file.setBase(basepath);
        grunt.log.writeln('Writing...'.cyan);
        grunt.file.write(file.dest, output);
        grunt.log.writeln('File ' + file.dest.cyan + ' created.');


        if (options.litmus) {
          var cm      = require('child_process').exec;
          var command = sendLitmus(output, title);

          cm(command, function(err, stdout, stderr) {
            if (err || stderr)
              console.log(err || stderr, stdout);

            // Delete XML After being curl'd
            grunt.file.delete('data.xml');

            next();
          });

        } else {
          next();
        }
      });

    }, function() {
      done();
    });

    function renderCss(input, callback) {

      var data = grunt.file.read(input);

      if ( path.extname(input) === '.less') {
        var parser = new(less.Parser)({
          paths     : [path.dirname(input)], // Specify search paths for @import directives
          filename  : path.basename(input) // Specify a filename, for better error messages
        });

        parser.parse(data, function (err, tree) {
          if (err)
            return console.error(err);

          data = tree.toCSS(); // Minify CSS output
          callback(data);
        });

      } else {

        callback(data);

      }
    }

    function renderJade(data, filename) {
      // Compile Jade files
      var jadeOptions = {
        filename: filename,
        pretty : true
      };

      var fn    = jade.compile(data, jadeOptions);
      var html  = fn(options.jade);

      return html;
    };

    function sendLitmus(data, title) {
      // Write the data xml file to curl, prolly can get rid of this somehow.

      var username    = options.litmus.username;
      var password    = options.litmus.password;
      var accountUrl  = options.litmus.url;
      var subject     = options.litmus.subject || title;
      var xml         = xmlBuild(data, subject);
      var command     = 'curl -i -X POST -u ' + username + ':' + password + ' -H \'Accept: application/xml\' -H \'Content-Type: application/xml\' ' + accountUrl + '/emails.xml -d @data.xml';

      // Write xml file
      grunt.file.write('data.xml', xml);

      // return command;
      return command;
    }

    //Application XMl Builder
    function xmlBuild(data, title) {
      var xmlApplications = builder.create('applications').att('type', 'array');

      _.each(options.litmus.applications, function(app) {
        var item = xmlApplications.ele('application');

        item.ele('code', app);
      });

      //Build Xml to send off, Join with Application XMl
      var xml = builder.create('test_set')
        .importXMLBuilder(xmlApplications)
        .ele('save_defaults', 'false').up()
        .ele('use_defaults', 'false').up()
        .ele('email_source')
          .ele('body').dat(data).up()
          .ele('subject', title)
        .end({pretty: true});
        
      return xml;
    }

  });

};
