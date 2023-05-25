const babel = require("@babel/core");
const generate = require("@babel/generator").default;

function evaluate(left, operator, right) {
	switch (operator) {
		case "+": return left + right;
		case "+=": return left += right;
		case "-": return left - right;
		case "-=": return left -= right;
		case "*": return left * right;
		case "*=": return left *= right;
		case "/": return left / right;
		case "=/": return left /= right;
		case "%": return left % right;
		case "%=": return left %= right;
		case "**": return left ** right;
		case "**=": return left **= right;
		case "<<": return left << right;
		case "<<=": return left <<= right;
		case ">>": return left >> right;
		case ">>=": return left >>= right;
		case ">>>": return left >>> right;
		case ">>>=": return left >>>= right;
		case "&": return left & right;
		case "&=": return left &= right;
		case "^": return left ^ right;
		case "^=": return left ^= right;
		case "|": return left | right;
		case "|=": return left |= right;
		case "&&": return left && right;
		case "&&=": return left &&= right;
		case "||": return left || right;
		case "||=": return left ||= right;
		case "??": return left ?? right;
		case "??=": return left ??= right;

		case "==": return left == right;
		case "!=": return left != right;
		case "===": return left === right;
		case "!==": return left !== right;
		case ">": return left > right;
		case ">=": return left >= right;
		case "<": return left < right;
		case "<=": return left <= right;

		//Miss unary operators

	}
}

function searchNode(ast, nodeName) {
	let type = null;
	let value = null;
	babel.traverse(ast, {
		enter(path) {
			if (path.node.type == "VariableDeclarator") {
				if (path.node.id.name == nodeName) {
					if (path.node.init.type.match(pattern)) {
						 type = path.node.init.type;
						 value = path.node.init.value;
					}
				}
			}
		}
	});
	return [type, value]
}

const code = 
`
function add() {
	let a = 3**3;
}
var a = 5 + 5 + 3 + 4;
var b = a + 2;
var c = a + b;
var d = 'h' + 'e';
var e = true + true;
var f = true + 's';
`;

const ast = babel.parse(code);

const pattern = /(Numeric|String|Boolean)Literal/;

// evaluation binary expressions

babel.traverse(ast, {
	exit(path) {
		if (path.node.type == "BinaryExpression") {
			if (path.node.left.type.match(pattern) && path.node.right.type.match(pattern)) {
				let value = evaluate(path.node.left.value, path.node.operator, path.node.right.value);
				if ( (path.node.left.type == "NumericLiteral" || path.node.left.type == "BooleanLiteral") && (path.node.right.type == "NumericLiteral" || path.node.right.type == "BooleanLiteral")) {
					path.node.type = "NumericLiteral";
					path.node.extra = {"rawValue": value, "raw": `${value}`};
				}
				if (path.node.left.type == "StringLiteral" || path.node.right.type == "StringLiteral") {
					path.node.type = "StringLiteral";
					path.node.extra = {"rawValue": value, "raw": `"${value}"`};
				}
				path.node.value = value;
			}
		}
	}

});

// costant propagation

babel.traverse(ast, {
	exit(path) {
		// check if the node type is an identifier and the identifier is right side of the express
		if (path.node.type == "Identifier" && path.parent.id != path.node) {
			const [type, value] = searchNode(ast, path.node.name);
			if (type != null && value != null) {
				path.node.type = type;
				if (type == "NumericLiteral")
					path.node.extra = {"rawValue": value, "raw": `${value}`};
				if (type == "StringLiteral")
					path.node.extra = {"rawValue": value, "raw": `"${value}"`};
				path.node.value = value;
 			}
		}
	}

});

const output = generate(ast);
console.log(output.code);