import { test, describe } from "node:test";
import assert from "node:assert/strict";

import deobfuscate from "../src/deobfuscator.js";

function removeNewLinesAndTabs(pieceOfCode) {
  return pieceOfCode.split("\n").join(" ").split("  ").join("");
}

test("transform function expressions into function declarations", () => {
  assert.strictEqual(
    removeNewLinesAndTabs(
      deobfuscate(`
        var sum = function(a, b) {
          return a + b;
        }
        var a = 2;
        console.log(sum(a, 2*a));
      `)
    ),
    `function sum(a, b) { return a + b; } console.log(sum(2, 4));`
  );
});

test("reconstruct variable declarations", () => {
  assert.strictEqual(
    removeNewLinesAndTabs(
      deobfuscate(`
        var a,b,c;
        console.log(a,b,c);`)
    ),
    `var a; var b; var c; console.log(a, b, c);`
  );
});

test("hex to value", () => {
  assert.strictEqual(deobfuscate(`console.log("\x61\x61\x61")`), `console.log("aaa");`);
});

test("bracket to dot", () => {
  assert.strictEqual(deobfuscate(`console["log"]("a")`), `console.log("a");`);
});

test("remove empty statement", () => {
  assert.strictEqual(deobfuscate(`;;;console.log("a");;;`), `console.log("a");`);
});

test("untangling scope confusion", () => {
  assert.strictEqual(
    removeNewLinesAndTabs(
      deobfuscate(`
        let x = 0; 
        { 
          let x = 30;
          x += 1;
        }
        x += 1;`)
    ),
    `let x = 0; { let _x = 30; _x += 1; } x += 1;`
  );
});

describe("if and conditional statement", () => {
  test("if always true", () => {
    assert.strictEqual(
      deobfuscate(`if (1 == 1) { console.log("1 == 1"); }`),
      `console.log("1 == 1");`
    );
  });
  test("if always true empty", () => {
    assert.strictEqual(
      deobfuscate(`if (1 == 1) { } else { console.log("1 != 1"); }`),
      ``
    );
  });
  test("if always false", () => {
    assert.strictEqual(
      deobfuscate(`if (1 != 1) { } else { console.log("1 != 1"); }`),
      `console.log("1 != 1");`
    );
  });
  test("if always false empty", () => {
    assert.strictEqual(deobfuscate(`if (1 != 1) { console.log("1 == 1"); }`), ``);
  });
  test("ternary always true", () => {
    assert.strictEqual(
      deobfuscate(`1 == 1 ? console.log("1 == 1") : console.log("no");`),
      `console.log("1 == 1");`
    );
  });
  test("ternary always false", () => {
    assert.strictEqual(
      deobfuscate(`1 != 1 ? console.log("1 == 1") : console.log("1 != 1");`),
      `console.log("1 != 1");`
    );
  });
});

describe("reachability of function", () => {
  test("unreachable function", () => {
    assert.strictEqual(
      deobfuscate(
        `
        function a() {}
        function b() { a(); } 
        function c() { a(); b(); } 
        console.log("a");
        `
      ),
      `console.log("a");`
    );
  });

  test("reachable function", () => {
    assert.strictEqual(
      removeNewLinesAndTabs(deobfuscate(`function a() {} console.log(a());`)),
      `function a() {} console.log(a());`
    );
  });
});

test("defeating array mapping", () => {
  assert.strictEqual(
    removeNewLinesAndTabs(
      deobfuscate(
        `
        var _0xa=["feel","log","free","to contribute"];
        console[_0xa[1]](_0xa[0]);
        console[_0xa[1]](_0xa[2]);
        console[_0xa[1]](_0xa[3])
        `
      )
    ),
    `console.log("feel"); console.log("free"); console.log("to contribute");`
  );
});

describe("defeating object mapping", () => {
  test("defeating object mapping with literals", () => {
    assert.strictEqual(
      deobfuscate(`var obj = { "a": 1 }; console.log(obj.a)`),
      `console.log(1);`
    );
  });
  test("defeating object mapping with no literals", () => {
    assert.equal(
      removeNewLinesAndTabs(
        deobfuscate(`var obj = {"a": Math.random()}; console.log(obj.a)`)
      ),
      `var obj = { "a": Math.random() }; console.log(obj.a);`
    );
  });
});

describe("constant folding", () => {
  test("constant propagation", () => {
    assert.strictEqual(deobfuscate(`var a = 5; console.log(a);`), `console.log(5);`);
  });
  test("non constant value", () => {
    assert.strictEqual(
      removeNewLinesAndTabs(deobfuscate(`var a = 5; a += 1; console.log(a);`)),
      `var a = 5; a += 1; console.log(a);`
    );
  });
});

describe("iife function", () => {
  test("iife function expression", () => {
    assert.strictEqual(
      deobfuscate(`(function () { console.log(5); })();`),
      `console.log(5);`
    );
  });
  test("iife arrow function expression", () => {
    assert.strictEqual(deobfuscate(`(() => { console.log(5); })();`), `console.log(5);`);
  });
});

describe("jsfuck notation", () => {
  test("array with empty values", () => {
    assert.strictEqual(deobfuscate(`+([[[[[[]], , ,]]]] != 0);`), `1;`);
  });
});
