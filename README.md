[![Build Status](https://travis-ci.org/box/leche.png?branch=master)](https://travis-ci.org/box/leche)
[![Project Status](http://opensource.box.com/badges/stable.svg)](http://opensource.box.com/badges)

# Leche

A JavaScript testing utility designed to work with Mocha and Sinon. This is intended for use both by Node.js and in browsers, so any changes must work in both locations.

## Installation

There are slightly different installation instructions based on where you want to use Leche.

### Including in Node.js

To include Leche in your Node.js project, go to your project directory and type:

```
npm i leche --save-dev
```

This command will automatically add Leche as a dependency inside of your `package.json` file.
To include Leche in a Node.js file, use `require()`:

```js
var leche = require('leche');
```

The `leche` object is a singleton, so there is no need to initialize it.

### Including in a Web Page

To include Leche in a web page, you can use [RawGit](http://rawgit.com).

The last published release:

```
<script src="https://cdn.rawgit.com/box/leche/master/dist/leche.js"></script>
```

Minified:

```
<script src="https://cdn.rawgit.com/box/leche/master/dist/leche.min.js"></script>
```

A specific version (in this example v2.1.0):

```
<script src="https://cdn.rawgit.com/box/leche/v2.1.0/dist/leche.js"></script>
```

Minified:

```
<script src="https://cdn.rawgit.com/box/leche/v2.1.0/dist/leche.min.js"></script>
```

**Note:** We highly recommend using a specific version as the master branch may change without notice.

A global `leche` object is created and is the same as the Node.js version.

## Creating Objects

Sometimes in testing you need to quickly create an object with specific methods that don't do anything in particular. The `leche.create()` method lets you specify an array of methods to create, and it returns an object with those methods stubbed out to do nothing. For example:

```js
var myObject = leche.create(["doSomething", "doSomethingElse"]);

myObject.doSomething();      // does nothing, actually
myObject.doSomethingElse();  // ditto

assert.ok(myObject.hasOwnProperty("doSomething"));       // passes
assert.ok(myObject.hasOwnProperty("doSomethingElse"));   // passes
```

Creating objects in this manner is useful when you don't have an original object from which to create a fake. You can pass this object into `leche.fake()` in order to create a fake (see next section).

## Creating Fakes

Fakes are objects that share a prototype chain and method definitions of another object, but do not implement any of the methods. Instead, the methods throw exceptions when called. This makes fakes useful for testing in several ways:

* You can create an object with the same interface as an actual object.
* You can use this object with `sinon.mock()` to set expectations that override the default method behavior of throwing an error. This ensures that only methods with expectations explicitly set can be called.
* The fake will pass any `instanceof` checks that the original object would pass.

Additionally, fakes contain all of the properties of the passed-in object. In ECMAScript 5 environments, accessing these properties without first setting them to a value will result in an errow.

To create a fake, pass in the object you want to fake to `leche.fake()`, such as:

```js
// source
function Person(name) {
    this.name = name;
}

Person.prototype.sayName = function() {
    console.log(this.name);
};

Person.prototype.sayHi = function() {
    console.log('Hi!');

};

// in a test
var fakePerson = leche.fake(new Person('Jeff'));

assert.ok(fakePerson instanceof Person);  // passes
assert.ok('sayName' in fakePerson);       // passes
assert.ok('name' in fakePerson);          // passes

// throws an error
fakePerson.sayName();

// also throws an error
var name = fakePerson.name;

// won't throw an error because you've assigned a value
fakePerson.name = 'Jeff';
var name = fakePerson.name;
```

Fakes are useful for creating mocks, where you set an expectation that a certain method will be called. Sinon will redefine the method with the expectation and no error will be thrown. However, trying to call any other method on the fake will result in an error. For example:

```js
 // in a test
var fakePersonMock = leche.fake(Person.prototype);
var fakePersonMockHandler = sinon.mock(fakePersonMock);

fakePersonMockHandler.expects('sayName');

fakePersonMock.sayName();    // no error - Sinon has mocked it out
fakePersonMock.sayHi();      // throws an error
```

This pattern is useful for a couple reasons:

1. Sinon will not let you set an expectation for a method that doesn't exist on fakePerson. It will throw an error.
1. Leche won't let you call a method for which an expectation has not been set. It will throw an error.

These features let you test the interface of existing objects in a robust and less error-prone way.

## Mocha Data Provider

Leche has a Mocha-specific data provider implementation called `withData()`. The intent of `withData()` is to mimic the `QUnit.cases` functionality in QUnit, allowing you to run the same tests over multiple values in a dataset. The basic format (using labels) is:

```js
var withData = leche.withData;

describe('MyObject', function() {

    withData({
        label1: [1, 2],
        label2: [3, 4]
    }, function(first, second) {

        it('should say the values are equal when they are passed', function() {
            assert.equal(first, second);
        });
    });
});
```

In this example, there are two data sets. The first is called "label1" and has an array of two values. The second is called "label2" and also has an array of two values. The label is used as part of the output from Mocha when an error occurs in the test. The arrays are used to specify the arguments that should be passed into the function. In this example, `first` would be 1 for the first dataset and `second` would be 2. For the second dataset, `first` would be 3 and `second` would be 4.

### Naming tests when using withData with labels

When using the label form of `withData()`, you should name the labels so that they complete the sentence created by your "it('should...')" definition. For example:

```js
describe('getSharedLinkForPadByClientID', function() {
    withData({
        'no fileId in session': [{authToken: 'abcdef123456'}],
        'no authToken in session': [{fileId: '123456678'}],
    }, function(sessionInfo) {
        it('should send error to client', function() {
            //...
        });
    });
});
```

If both these test failed, the outputted error message would look like:

```
1) getSharedLinkForPadByClientID with no fileId in session should send error to client
2) getSharedLinkForPadByClientID with no authToken in session should send error to client
```

### withData() without labels

You can also pass data without labels, and `withData()` will do its best to create a label that makes sense:

```js
var withData = leche.withData;

describe('MyObject', function() {

    withData([
        [1, 2],
        [3, 4]
    ], function(first, second) {

        it('should say the values are equal when they are passed', function() {
            assert.equal(first, second);
        });
    });
});
```

This is the same as the previous example, except the labels will come out as "1,2" for the first dataset and "3,4" for the second.

## Frequently Asked Questions

### What is "Leche"?

You put leche in your mocha to make it taste awesome.

## Build System

This project uses `make` for its build system, but you should use `npm` for executing commands. The following commands are available:

* `npm test` - runs linting and unit tests (plus code coverage)
* `npm run lint` - runs just linting
* `npm run jsdoc` - creates JSDoc documentation
* `npm run deps` - updates remote dependencies
* `npm run browserify` - creates a version that will run in browsers
* `npm run patch` - create a patch version update and push to GitHub Enterprise
* `npm run minor` - create a minor version update and push to GitHub Enterprise
* `npm run major` - create a major version update and push to GitHub Enterprise

## Developing Leche

1. Clone this repo.
1. Run `npm install`.
1. Run `npm test` to ensure everything is working.
1. Profit.

## Support

Need to contact us directly? Email oss@box.com and be sure to include the name of this project in the subject.

## Copyright and License

Copyright 2014 Box, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
