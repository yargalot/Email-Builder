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

  var task_name = 'EmailBuilder',
      task_description = 'Compile Files',
      juice = require('juice'),
      http = require('http'),
      builder = require('xmlbuilder'),
      jsdom = require('jsdom'),
      less = require('less'),
      jade = require('jade'),
      path = require('path'),
      _ = grunt.utils._,
      helpers = require('grunt-lib-contrib').init(grunt);

  grunt.registerMultiTask(task_name, task_description, function() {

    var options = helpers.options(this),
        files = this.data.files,
        basepath = options.basepath,
        done = this.async();
    
    this.files = helpers.normalizeMultiTaskFiles(this.data, this.target); 

    grunt.util.async.forEachSeries(this.files, function(file, next) {
      var css = file.src,
          html = file.dest,
          output = grunt.file.read(html);

      var basename = path.basename(html,  '.html');

      var inline_css ='', 
          style_css = '';
          
      if (_.isArray(css)) {
        inline_css = renderCss(css[0]);
        style_css = renderCss(css[1]);
      } else {
        inline_css = renderCss(css);
      }

      // HEYO sup jade
      if ( path.extname(html) === '.jade')  {

        var jadeOptions = {
          pretty : true
        };

        var fn = jade.compile(output, jadeOptions),
            myArry = ['moo', 'boo', 'roo'],
            myObj = { foo: 'bar', woo:'loo' };

        output = fn({ myArry: myArry, myObj: myObj });
        basename = path.basename(html,  '.jade')     
      }

      output = juice(output, inline_css);

      // Js dom - Might use this to sniff out the style pathways for css. Gets title atm
      var document = jsdom.html(output),
          window = document.createWindow(),
          date = String(Math.round(new Date().getTime() / 1000)),
          title = document.title+' '+date;

      // If a second Css file is provided this will be added in as a style tag.
      if (style_css) {
        var style_tag = document.createElement('style');
        var head = document.getElementsByTagName('head')[0];

        style_tag.type = 'text/css';
        style_tag.innerHTML = style_css;

        head.appendChild(style_tag);

        output = document.innerHTML;
      }

      if (!basepath) basepath = 'emails/';

      grunt.file.write(basepath + basename+'.html', output);

      if (options.litmus) {

        var cm = require('child_process').exec,
            fs = require('fs');

        var command = sendLitmus(output, title);

        console.log(command)
        cm(command, function(err, stdout, stderr) {
          if (err || stderr) { console.log(err || stderr, stdout)}

          // Delete XML After being curl'd
          fs.unlinkSync('data.xml');
          next();
        });
      
      } else {
        next(); 
      }
   
    }, function() {
      done()
    });

    function renderCss(input) {

      var data = grunt.file.read(input)

      if ( path.extname(input) === '.less') 
        less.render(data, function (e, css) {
           data = css;
        });

      return data;
    }

    function sendLitmus(data, title) {
      // Write the data xml file to curl, prolly can get rid of this somehow.

      var xml = xmlBuild(data, title);  

      grunt.file.write('data.xml', xml);

      var username = options.litmus.username,
          password = options.litmus.password,
          accountUrl = options.litmus.url;

      var command = 'curl -i -X POST -u '+username+':'+password+' -H \'Accept: application/xml\' -H \'Content-Type: application/xml\' '+accountUrl+'/emails.xml -d @data.xml';

      return command;    
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

      return xml;
    }

  });

  // ==========================================================================
  // HELPERS
  // ==========================================================================


};