# im-resize

[![Build status](https://img.shields.io/wercker/ci/553c052c1f74af18461065db.svg "Build status")](https://app.wercker.com/project/bykey/de024521812381e9c956d9c8fee3c3c4)
[![NPM downloads](https://img.shields.io/npm/dm/im-resize.svg "NPM downloads")](https://www.npmjs.com/package/im-resize)
[![NPM version](https://img.shields.io/npm/v/im-resize.svg "NPM version")](https://www.npmjs.com/package/im-resize)
[![Node version](https://img.shields.io/node/v/im-resize.svg "Node version")](https://www.npmjs.com/package/im-resize)
[![Dependency status](https://img.shields.io/david/turistforeningen/node-im-resize.svg "Dependency status")](https://david-dm.org/turistforeningen/node-im-resize)

Efficient image resize with support for multiple thumbnail configurations using
ImageMagick's [`convert`](http://imagemagick.org/www/convert.html) command.

## Requirements

* ImageMagick

## Install

```
npm install im-resize --save
```

## API

```js
var resize = require('im-resize');
```

### resize(**object** `image`, **object[]** `versions`, **function** `cb`)

Resize a given source `image` into several `versions`.

* **object** `image` - source image to resize
  * **integer** `width` - image pixel width
  * **integer** `height` - image pixel height
  * **string** `path` - complete path to source image
* **object[]** `versions` - Array of version objects
  * **string** `suffix` - suffix for the resized image (ex. "-small")
  * **integer** `maxWidth` - max width for resized image
  * **integer** `maxHeight` - max height for resized image
  * **string** `ratio` - force aspectratio on resized image (ex. "4:3")
  * **boolean** `flatten` - merge all layers. [Read more](http://www.imagemagick.org/script/command-line-options.php#flatten)
  * **string** `background` - set a background color on the current canvas, accepts a color name, a hex color, or a numerical RGB, RGBA, HSL, HSLA, CMYK, or CMYKA specification. (ex. "red", "#ff0000")
  * **string** `format` - output format to convert the original image to. (ex. "png") [Read more](http://www.imagemagick.org/script/command-line-options.php#format)
* **function** `cb` - callback function (**Error** `error`, **object[]** `versions`)
  * **Error** `error` - error output if command failed
  * **object[]** `versions` - resized image versions
    * **string** `path` path to the resized image

#### Example

```js
var image = {
  path: '/path/to/image.jpg',
  width: 1024,
  height: 768
};

var versions = [{
  suffix: '-thumb',
  maxHeight: 150,
  maxWidth: 150,
  aspect: "3:2"
},{
  suffix: '-square',
  maxHeight: 200,
  maxWidth: 200,
  aspect: "1:1",
  flatten: true,
  format: "png",
  background: "green"
]};

resize(image, versions, function(error, versions) {
  if (error) { console.error(error); }
  console.log(versions[0].path); // /path/to/image-thumb.jpg
  console.log(versions[1].path); // /path/to/image-square.jpg
});
```

## [MIT License](https://github.com/Turistforeningen/node-im-resize/blob/master/LICENSE)
