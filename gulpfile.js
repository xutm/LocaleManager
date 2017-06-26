var gulp = require('gulp'),
      less = require('gulp-less'),
      exec = require('child_process').exec,
      spawn = require('child_process').spawn;
var LessPluginCleanCSS = require('less-plugin-clean-css'),
    cleancss = new LessPluginCleanCSS({ advanced: true });

gulp.task('less', function () {
    return gulp.src('./client/styles/less/main.less')
        .pipe(less({
            plugins: [cleancss]
        }))
        .pipe(gulp.dest('./client/styles/css'));
});

gulp.task('start', function() {
	//exec('node server/app.js');	
	spawn('node', ['server/app.js'], {stdio: 'inherit'});
});

gulp.task('default', ['less', 'start']);

gulp.task('build', ['less']);

gulp.task('develop', function () {
  nodemon({ script: 'server/app.js'
          , ext: 'html js'
          , ignore: ['ignored.js']
          , tasks: ['lint'] })
    .on('restart', function () {
      console.log('restarted!')
    })
})