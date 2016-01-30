module.exports = bundleFactory

var gutil = require('gulp-util')
var merge = require('lodash.merge')
var browserify = require('browserify')
var watchify = require('watchify')
var duration = require('gulp-duration')
var source = require('vinyl-source-stream')
var notifier = require('node-notifier')
var streamify = require('gulp-streamify')
var uglify = require('gulp-uglify')
var gulp = require('gulp')

var DEFAULTS = {
    start: gutil.colors.green('Bundling JavaScript...')
  , time: 'Bundled JavaScript'
  , error: function () {}
  , buildNotifications: false
  , notificationText: 'Build is ready'
  , notificationTitle: 'BUILD'
  , onUpdate: function () {}
  , browserifyOpts: {}
  , transforms: []
  , excludes: []
  , ignores: []
  , plugins: []
  , filename: 'app.js'
  , uglify: {
        mangle: true
      , output: { quote_keys: true }
    }
}

function bundleFactory (options) {
    options = merge({}, DEFAULTS, options)
    var bundler

    return bundle

    function getBundler (entry, dest, params) {
        if (bundler) return bundler

        if (params.once) {
            bundler = browserify(options.browserifyOptions)
        }
        else {
            var opts = merge(options.browserifyOptions, watchify.args)
            bundler = watchify(browserify(opts))
            bundler.on('update', function (updated) {
                bundle(entry, dest, params, function() {
                  options.onUpdate(updated)
                })
            })
        }

        bundler.add(entry)
        options.transforms.forEach(function (transform) {
            bundler.transform(transform)
        })

        options.plugins.forEach(function (plugin) {
            bundler.plugin(plugin.plugin, plugin.opts)
        })

        options.excludes.forEach(function (exclude) {
            bundler.exclude(exclude)
        })

        options.ignores.forEach(function (ignore) {
            bundler.ignore(ignore)
        })

        return bundler
    }

    function bundle (entry, dest, params, cb) {
        params = params || {}
        cb = cb || function () {}
        gutil.log(options.start)

        var minify = params.minify

        var stream = getBundler(entry, dest, params)
            .bundle()
            .on('error', options.error)
            .pipe(source(options.filename))
            .pipe(duration(options.time))
            .on('end', function () {
                if (!options.buildNotifications) return
                notifier.notify({
                    title: options.notificationTitle
                  , message: options.notificationText
                })
            })

        if (params.minify) {
          stream = stream.pipe(streamify(uglify(options.uglify)))
        }

        return stream.pipe(gulp.dest(dest))
            .on('end', cb)
    }
}