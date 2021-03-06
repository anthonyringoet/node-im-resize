/*jshint laxbreak:true */

var assert = require('assert');
var crypto = require('crypto');
var fs = require('fs');
var resize = require('./index');

describe('resize.path()', function() {
  it('returns new relative path with suffix', function() {
    var path = resize.path('./foo.jpg', {prefix: '', suffix: '-bar'});

    assert.equal(path, 'foo-bar.jpg');
  });

  it('returns new relative path with custom format', function() {
    var path = resize.path('./foo.jpg', {
      prefix: '',
      suffix: '-bar',
      format: 'png'
    });

    assert.equal(path, 'foo-bar.png');
  });

  it('returns new absolute path with suffix', function() {
    var path = resize.path('/foo/bar/baz.jpg', {prefix: '', suffix: '-bix'});
    assert.equal(path, '/foo/bar/baz-bix.jpg');
  });

  it('returns new absolute path with custom format', function() {
    var path = resize.path('/foo/bar/baz.jpg', {
      prefix: '',
      suffix: '-bix',
      format: 'png'
    });

    assert.equal(path, '/foo/bar/baz-bix.png');
  });

  it('returns new path with prefix', function() {
    var path = resize.path('/foo/bar/baz.jpg', {prefix: 'prefix-', suffix: ''});
    assert.equal(path, '/foo/bar/prefix-baz.jpg');
  });

  it('returns new path with custom directory', function() {
    var path = resize.path('/foo/bar/baz.jpg', {
      prefix: 'im-',
      suffix: '',
      path: '/tmp'
    });

    assert.equal(path, '/tmp/im-baz.jpg');
  });
});

describe('resize.crop()', function() {
  it('returns crop geometry for horisontal image', function() {
    var image = {width: 5184, height: 2623};
    assert.equal(resize.crop(image, '3:2'), '3936x2623+624+0');
  });

  it('returns crop geometry for vertical image', function() {
    var image = {height: 5184, width: 2623};
    assert.equal(resize.crop(image, '3:2'), '2623x3936+0+624');
  });

  it('returns false for image with correct aspectratio', function() {
    var image = {width: 2000, height: 1000};
    assert.equal(resize.crop(image, '2:1'), false);
  });

  it('returns false if no aspectratio is defined', function() {
    var image = {width: 2000, height: 1000};
    assert.equal(resize.crop(image), false);
  });
});

describe('resize.cmd()', function() {
  var output, image;

  beforeEach(function() {
    image = {
      path: './assets/horizontal.jpg',
      width: 5184,
      height: 2623
    };

    output = {
      versions: [{
        suffix: '-full',
        maxHeight: 1920,
        maxWidth: 1920
      },{
        suffix: '-1200',
        maxHeight: 1200,
        maxWidth: 1200,
        aspect: "3:2"
      }]
    };
  });

  it('sets global path to each version', function() {
    output.path = '/tmp';
    resize.cmd(image, output);

    assert.equal(output.versions[0].path, '/tmp/horizontal-full.jpg');
    assert.equal(output.versions[1].path, '/tmp/horizontal-1200.jpg');
  });

  it('sets global prefix to each version', function() {
    output.prefix = 'im-';
    resize.cmd(image, output);

    assert.equal(output.versions[0].path, 'assets/im-horizontal-full.jpg');
    assert.equal(output.versions[1].path, 'assets/im-horizontal-1200.jpg');
  });

  it('sets default quality to each version', function() {
    resize.cmd(image, output);

    assert.equal(output.versions[0].quality, 80);
    assert.equal(output.versions[1].quality, 80);
  });

  it('sets global quality to each version', function() {
    output.quality = 20;
    resize.cmd(image, output);

    assert.equal(output.versions[0].quality, 20);
    assert.equal(output.versions[1].quality, 20);
  });

  it('preserves local version quality', function() {
    output.quality = 30;
    output.versions[1].quality = 99;

    resize.cmd(image, output);

    assert.equal(output.versions[0].quality, 30);
    assert.equal(output.versions[1].quality, 99);
  });

  it('returns convert command', function() {
    var cmd = resize.cmd(image, output);
    assert.equal(cmd, [
      // original image
      'convert ./assets/horizontal.jpg',
      '-auto-orient',
      '-strip',
      '-write mpr:./assets/horizontal.jpg +delete',

      // version[0]
      'mpr:./assets/horizontal.jpg',
      '-quality 80',
      '-resize "1920x1920"',
      '-write assets/horizontal-full.jpg +delete',

      // version[1]
      'mpr:./assets/horizontal.jpg',
      '-quality 80',
      '-crop "3936x2623+624+0"',
      '-resize "1200x1200"',
      'assets/horizontal-1200.jpg'
    ].join(' '));
  });
});

describe('resize.cmdVersion()', function() {
  var image, version;

  beforeEach(function() {
    image = {
      path: './a.jpg',
      width: 2000,
      height: 1000
    };

    version = {
      path: 'a-b.jpg',
      maxWidth: 500,
      maxHeight: 500
    };
  });

  it('returns convert command for version', function() {
    var cmd = resize.cmdVersion(image, version);
    var out = 'mpr:./a.jpg -resize "500x500" -write a-b.jpg +delete';

    assert.equal(cmd, out);
  });

  it('returns convert command for last version', function() {
    var cmd = resize.cmdVersion(image, version, true);
    var out = 'mpr:./a.jpg -resize "500x500" a-b.jpg';

    assert.equal(cmd, out);
  });

  it('sets quality if specified', function() {
    version.quality = 50;

    var cmd = resize.cmdVersion(image, version);
    var out = 'mpr:./a.jpg -quality 50 -resize "500x500" -write a-b.jpg +delete';

    assert.equal(cmd, out);
  });

  it('sets crop if aspect ratio is defined', function() {
    version.aspect = '4:3';

    var cmd = resize.cmdVersion(image, version);
    var out = [
      'mpr:./a.jpg',
      '-crop "1334x1000+333+0"',
      '-resize "500x500"',
      '-write a-b.jpg',
      '+delete'
    ].join(' ');

    assert.equal(cmd, out);
  });
});

describe('resize()', function() {
  var output;

  beforeEach(function() {
    output = {
      versions: [{
        suffix: '-full',
        maxHeight: 1920,
        maxWidth: 1920
      },{
        suffix: '-1200',
        maxHeight: 1200,
        maxWidth: 1200,
        aspect: "3:2"
      },{
        suffix: '-800',
        maxHeight: 800,
        maxWidth: 800,
        aspect: "3:2"
      },{
        suffix: '-500',
        maxHeight: 500,
        maxWidth: 500,
        aspect: "3:2"
      },{
        suffix: '-260',
        maxHeight: 260,
        maxWidth: 260,
        aspect: "3:2"
      },{
        suffix: '-150',
        maxHeight: 150,
        maxWidth: 150,
        aspect: "3:2"
      },{
        suffix: '-square-200',
        maxHeight: 200,
        maxWidth: 200,
        aspect: "1:1"
      },{
        suffix: '-square-50',
        maxHeight: 50,
        maxWidth: 50,
        aspect: "1:1"
      }]
    };
  });

  it('resisizes horizontal image', function(done) {
    this.timeout(10000);

    var image = {
      path: './assets/horizontal.jpg',
      width: 5184,
      height: 2623
    };

    var checksum = {
      'assets/horizontal-full.jpg'      : '1a97483f4dfc21ea77217731a0f1908f8edeec22',
      'assets/horizontal-1200.jpg'      : '54f1be17d4ffac0cb23802f1c04e783594662a8a',
      'assets/horizontal-800.jpg'       : '9ebf00a2d96361720dcbcb66af14689d3d51269f',
      'assets/horizontal-500.jpg'       : '58b09dc1f4ecf22427cc73ffd7b8ef2194fff4bb',
      'assets/horizontal-260.jpg'       : '33437a2300f7d991c439d532075e211aad962a78',
      'assets/horizontal-150.jpg'       : 'ad5957669f0774cd66be76414dcbe6b0d789367d',
      'assets/horizontal-square-200.jpg': '576b72b83f486cfc684f459670e912310427a6a5',
      'assets/horizontal-square-50.jpg' : 'cc0291eb853ceba62b009626ae7a0e68562e93de'
    };

    resize(image, output, function(err, versions) {
      assert.ifError(err);
      assert(versions instanceof Array);

      for(var i = 0; i < versions.length; i++) {
        var file = fs.readFileSync(versions[i].path);
        var sha = crypto.createHash('sha1').update(file).digest('hex');

        assert.equal(sha, checksum[versions[i].path]);
      }

      done();
    });
  });

  it('resisizes vertical image', function(done) {
    this.timeout(10000);

    var image = {
      path: './assets/vertical.jpg',
      width: 1929,
      height: 3456
    };

    var checksum = {
      'assets/vertical-full.jpg'      : '709746db3a56f66066f846e273db78dee60d0311',
      'assets/vertical-1200.jpg'      : '6f1f88a98e43377728864a42ad1123126b66c1f7',
      'assets/vertical-800.jpg'       : '95fbe34e98dd7839b1bde9400f4c7a6784e408b3',
      'assets/vertical-500.jpg'       : '474242606e782deafe7af976f23513697b622cf4',
      'assets/vertical-260.jpg'       : '4e49f570413c9f15156b1cf99febe9054e2f294f',
      'assets/vertical-150.jpg'       : '9d8ec5975d548ee0b2f6f83c5f896c0fcd5d3a88',
      'assets/vertical-square-200.jpg': '1d2a9b581b7f989e44384f4eabde1fc5085d20ad',
      'assets/vertical-square-50.jpg' : '33e038f5fbcbc92991d68e343733bb0735286243'
    };

    resize(image, output, function(err, versions) {
      assert.ifError(err);

      assert(versions instanceof Array);
      assert.equal(versions.length, output.versions.length);

      for(var i = 0; i < versions.length; i++) {
        var file = fs.readFileSync(versions[i].path);
        var sha = crypto.createHash('sha1').update(file).digest('hex');

        assert.equal(sha, checksum[versions[i].path]);
      }

      done();
    });
  });

  it('resizes transparent image', function(done) {
    this.timeout(10000);

    var image = {
      path: './assets/transparent.png',
      width: 800,
      height: 600
    };

    for (var i = 0; i < output.versions.length; i++) {
      output.versions[i].flatten = true;
      output.versions[i].background = 'red';
      output.versions[i].format = 'jpg';
    }

    var checksum = {
      'assets/transparent-full.jpg'      : '78e3647bc9f86f3e0a8a0a25dcc60fba519c29b9',
      'assets/transparent-1200.jpg'      : '35069de49846815381830b4c46ab90f75eba43aa',
      'assets/transparent-800.jpg'       : '017ec8afb9a81eae00132105da9cd6ea4083011c',
      'assets/transparent-500.jpg'       : 'c0705376d473724384e6ed30a1305683023780e9',
      'assets/transparent-260.jpg'       : '1ccf58141dfa60fe2cc74f024a9df82172e235d4',
      'assets/transparent-150.jpg'       : 'f46d2e15c618b65d9e082f605e894d5ebd6a5450',
      'assets/transparent-square-200.jpg': '012230141cb127947cfe958c452560b7a50d2425',
      'assets/transparent-square-50.jpg' : 'ea8a03a6f9acfd1c5170c4b5d382c84aa3b304dc'
    };

    resize(image, output, function(err, versions) {
      assert.ifError(err);

      assert(versions instanceof Array);
      assert.equal(versions.length, output.versions.length);

      for(var i = 0; i < versions.length; i++) {
        var file = fs.readFileSync(versions[i].path);
        var sha = crypto.createHash('sha1').update(file).digest('hex');

        assert.equal(sha, checksum[versions[i].path]);
      }

      done();
    });
  });

  it('auto-rotates rotated image', function(done) {
    this.timeout(10000);

    var image = {
      path: './assets/autorotate.jpg',
      width: 3264,
      height: 2448
    };

    var checksum = {
      'assets/autorotate-full.jpg'      : 'efe10ac17cae71bd28c316728d6d29eeacc11fd8',
      'assets/autorotate-1200.jpg'      : 'e8f5b75aa6c9859426c1d652d57a053444f897ff',
      'assets/autorotate-800.jpg'       : '081df1cc1a3d7d76a0762f0d586dbecff221a25c',
      'assets/autorotate-500.jpg'       : 'c5437d9b2dbbf791931ca9089020c78ac8fd02a3',
      'assets/autorotate-260.jpg'       : 'a9b811a19fb078264e655c0c3c01acffda8d192e',
      'assets/autorotate-150.jpg'       : 'd837d5fb4239f9fe1e3566df34906e3f8d654275',
      'assets/autorotate-square-200.jpg': '24efb279a78b0c33a8715215d6f976c1f086573a',
      'assets/autorotate-square-50.jpg' : 'f716e975f6269c3b9649a04d4144c5481265169c'
    };

    resize(image, output, function(err, versions) {
      assert.ifError(err);

      assert(versions instanceof Array);
      assert.equal(versions.length, output.versions.length);

      for(var i = 0; i < versions.length; i++) {
        var file = fs.readFileSync(versions[i].path);
        var sha = crypto.createHash('sha1').update(file).digest('hex');

        assert.equal(sha, checksum[versions[i].path]);
      }

      done();
    });
  });
});
