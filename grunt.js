module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    test: {
      files: ['test/**/*.js']
    },
    lint: {
      files: ['grunt.js', 'tasks/**/*.js', 'test/**/*.js']
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'default'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true,
        es5: true
      },
      globals: {}
    },
    EmailBuilder: {
      options: {
        litmus : {
          username : 'username',
          password : 'password',
          url : 'yoursite.litmus.com',
          applications : ['gmail', 'hotmail']
        },
        basepath : 'example/'
      },
      files : {
        'example/html/email.html' : ['example/css/inline.css']
      }
    }
  });

  // Load local tasks.
  grunt.loadTasks('tasks');

  // Default task.
  grunt.registerTask('default', 'EmailBuilder');

};
