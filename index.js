var exec = require('child_process').exec, child;
var aspect = require('aspectratio');
var dirname = require('path').dirname;
var basename = require('path').basename;
var extname = require('path').extname;
var join = require('path').join;
var sprintf = require('util').format;

module.exports = function(image, output, cb) {
  var cmd = module.exports.cmd(image, output.versions);
  exec(cmd, {timeout: 10000}, function(e, stdout, stderr) {
    if (e) { return cb(e); }
    if (stderr) { return cb(new Error(stderr)); }

    return cb(null, output.versions);
  });
};

/**
 * Get cropped geometry for given aspectratio
 *
 * @param string image - original image metadata
 * @param string ratio - new aspect ratio
 *
 * @return string geometry; false if no crop applies
 */
module.exports.crop = function(image, ratio) {
  if (!ratio) { return false; }

  var g = aspect.fixed(image.width, image.height, ratio);

  // Check if the image already has the decired aspectratio.
  if (g[0] === 0 && g[1] === 0) {
    return false;
  } else {
    return g[2] + 'x' + g[3]  + '+' + g[0] + '+' + g[1];
  }
};

/**
 * Get new path with suffix
 *
 * @param string path - image path
 * @param string opts - output path transformations
 *  * format
 *  * suffix
 *
 * @return string path
 */
module.exports.path = function(path, opts) {
  var dir = dirname(path);
  var ext = extname(path);
  var base = basename(path, ext);

  if (opts.format) {
    ext = '.' + opts.format;
  }

  return join(dir, base + opts.suffix + ext);
};

/**
 * Get convert command
 *
 * @param object image - original image object
 * @param Array versions - derivated versions
 *
 * @return string convert command
 */
module.exports.cmd = function(image, versions) {
  var cmd = [
    sprintf('convert %s -strip -write mpr:%s +delete', image.path, image.path)
  ];

  for (var i = 0; i < versions.length; i++) {
    cmd.push(module.exports.cmdVersion(image, versions[i], i === versions.length-1));
  }

  return cmd.join(' ');
};

/**
 * Get convert command for single version
 *
 * @param object image - original image object
 * @param object version - derivated version
 * @patam boolean last - true if this is last version
 *
 * @return string version convert command
 */
module.exports.cmdVersion = function(image, version, last) {
  var cmd = [];

  // http://www.imagemagick.org/Usage/files/#mpr
  cmd.push(sprintf('mpr:%s', image.path));

  // -quality
  cmd.push(sprintf('-quality %d', version.quality || 80));

  // -background
  if (version.background) {
    cmd.push(sprintf('-background "%s"', version.background));
  }

  // -flatten
  if (version.flatten) {
    cmd.push('-flatten');
  }

  // -crop
  var crop = module.exports.crop(image, version.aspect);
  if (crop) {
    cmd.push(sprintf('-crop "%s"', crop));
  }

  // -resize
  cmd.push(sprintf('-resize "%dx%d"', version.maxWidth, version.maxHeight));

  // -write
  version.path = module.exports.path(image.path, {
    suffix: version.suffix || '',
    format: version.format
  });

  if (last) {
    cmd.push(version.path);
  } else {
    cmd.push(sprintf('-write %s +delete', version.path));
  }

  return cmd.join(' ');
};
