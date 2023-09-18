function createNestedObject(arr) {
  const result = [];

  // Helper function to recursively build the nested structure
  function buildNestedStructure(obj, keys) {
    if (keys.length === 0) {
      return;
    }

    const key = keys.shift();
    const path = obj.path ? `${obj.path}/${key}` : key;
    let child = obj.children.find((c) => c.name === key);

    if (!child) {
      child = { name: key, path, children: [] };
      obj.children.push(child);
    }

    buildNestedStructure(child, keys);
  }

  for (const path of arr) {
    const keys = path.split('/');
    buildNestedStructure({ children: result }, keys);
  }

  return result;
}

// Example usage:
const input = [
  "foo/bar/baz",
  "foo/bar/bang",
  "foo/qux",
  "jig",
];

const nestedObject = createNestedObject(input);
console.log(nestedObject);
