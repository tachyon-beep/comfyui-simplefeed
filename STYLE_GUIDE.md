# JavaScript Style Guide for ComfyUI Simple Image Feed

## 1. Naming Conventions

### Variable and Function Names

- Use camelCase for variable and function names.
- Be descriptive with names.

```javascript
// Good
const imageContainer = document.createElement('div');
function handleImageClick() { ... }

// Bad
const img_container = document.createElement('div');
function handle_image_click() { ... }
```

### Class Names

- Use PascalCase for class names.

```javascript
// Good
class ImageFeed { ... }

// Bad
class imageFeed { ... }
```

### Constant Names

- Use UPPER_SNAKE_CASE for constants.

```javascript
// Good
const MAX_IMAGE_COUNT = 100;

// Bad
const maxImageCount = 100;
```

### Private Properties and Method Names

- Prefix private properties and methods with an underscore.

```javascript
class Lightbox {
  _privateMethod() { ... }
}
```

## 2. Code Structure

### Modules

- Use ES6 module syntax for imports and exports.

```javascript
// Good
import { ImageFeed } from './imageFeed.js';
export class Lightbox { ... }

// Bad
const ImageFeed = require('./imageFeed.js');
module.exports = Lightbox;
```

### Classes

- Use ES6 class syntax.
- Group methods by functionality.

```javascript
class ImageFeed {
  constructor() { ... }

  // Public methods
  show() { ... }
  hide() { ... }

  // Private methods
  _setupEventListeners() { ... }
  _handleImageLoad() { ... }
}
```

## 3. Formatting

### Indentation

- Use 2 spaces for indentation.

### Line Length

- Limit lines to 80 characters where possible.

### Semicolons

- Always use semicolons at the end of statements.

### Curly Braces

- Always use curly braces, even for single-line blocks.
- Open curly brace on the same line as the statement.

```javascript
// Good
if (condition) {
  doSomething();
}

// Bad
if (condition) doSomething();
```

## 4. Comments and Documentation

### JSDoc

- Use JSDoc comments for classes, methods, and functions.

```javascript
/**
 * Represents an image feed.
 */
class ImageFeed {
  /**
   * Creates an instance of ImageFeed.
   * @param {HTMLElement} container - The container element.
   */
  constructor(container) { ... }

  /**
   * Loads images into the feed.
   * @param {string[]} imageUrls - Array of image URLs.
   * @returns {Promise<void>}
   */
  loadImages(imageUrls) { ... }
}
```

### Inline Comments

- Use inline comments sparingly, only when necessary to explain complex logic.

## 5. Best Practices

### Use Strict Mode

- Always use strict mode at the beginning of each file.

```javascript
'use strict';
```

### Avoid Global Variables

- Minimize the use of global variables.
- Use modules to encapsulate functionality.

### Error Handling

- Use try-catch blocks for error-prone code.
- Provide meaningful error messages.

```javascript
try {
  // Risky operation
} catch (error) {
  console.error('Failed to perform operation:', error.message);
}
```

### Promises and Async/Await

- Prefer async/await over raw promises for asynchronous code.

```javascript
// Good
async function loadImage(url) {
  try {
    const response = await fetch(url);
    return await response.blob();
  } catch (error) {
    console.error('Image load failed:', error);
  }
}

// Less Preferred
function loadImage(url) {
  return fetch(url)
    .then(response => response.blob())
    .catch(error => {
      console.error('Image load failed:', error);
    });
}
```

### Avoid Magic Numbers

- Use named constants for magic numbers.

```javascript
// Good
const MAX_RETRY_ATTEMPTS = 3;
for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) { ... }

// Bad
for (let i = 0; i < 3; i++) { ... }
```

## 6. Performance

### DOM Manipulation

- Minimize direct DOM manipulation.
- Use DocumentFragment for batch DOM updates.

### Event Listeners

- Remove event listeners when they are no longer needed.

### Debounce and Throttle

- Use debounce or throttle for frequently triggered events like scroll or resize.

## 7. Testing

### Unit Tests

- Write unit tests for all public methods.
- Use a testing framework like Jest.

### Naming Conventions for Tests

- Use descriptive names for test cases.

```javascript
describe('ImageFeed', () => {
  it('should load images when given valid URLs', () => { ... });
  it('should throw an error when given invalid URLs', () => { ... });
});
```

## 8. Version Control

### Commit Messages

- Write clear, concise commit messages.
- Use present tense ("Add feature" not "Added feature").

### Branching

- Use feature branches for new features.
- Use hotfix branches for critical bugs.

## 9. Accessibility

- Ensure keyboard navigation works for all interactive elements.
- Use appropriate ARIA attributes.

## 10. Browser Compatibility

- Specify supported browsers in your documentation.
- Use appropriate polyfills or transpilation for older browsers if necessary.
