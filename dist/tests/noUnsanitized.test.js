import { RuleTester } from "eslint";
import noUnsanitizedPlugin from "eslint-plugin-no-unsanitized";
const ruleTester = new RuleTester();
ruleTester.run("property", noUnsanitizedPlugin.rules.property, {
    valid: [
        {
            name: 'textContent',
            code: `
              el.textContent = "safe";
              el.textContent = variable;
            `
        },
        {
            name: 'className',
            code: 'el.className = "my-class";'
        },
        {
            name: 'title',
            code: 'document.title = "Hello";'
        },
    ],
    invalid: [
        {
            name: 'innerHTML =',
            code: 'el.innerHTML = "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            name: 'innerHTML +=',
            code: 'el.innerHTML += "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            name: 'innerHTML ||=',
            code: 'el.innerHTML ||= userInput;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            name: 'innerHTML &&=',
            code: 'el.innerHTML &&= userInput;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            name: 'innerHTML ??=',
            code: 'el.innerHTML ??= userInput;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            name: 'innerHTML template literal',
            code: 'el.innerHTML = `<div>${userInput}</div>`;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            name: 'outerHTML =',
            code: 'el.outerHTML = "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to outerHTML" }],
        },
        {
            name: 'outerHTML +=',
            code: 'el.outerHTML += "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to outerHTML" }],
        },
    ],
});
ruleTester.run("method", noUnsanitizedPlugin.rules.method, {
    valid: [
        {
            name: 'createElement',
            code: 'document.createElement("div");'
        },
        {
            name: 'setAttribute',
            code: 'el.setAttribute("class", "safe");'
        },
        {
            name: 'appendChild',
            code: 'el.appendChild(child);'
        },
    ],
    invalid: [
        {
            name: 'insertAdjacentHTML',
            code: 'el.insertAdjacentHTML("beforeend", "<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to el.insertAdjacentHTML for argument 1" }],
        },
        {
            name: 'createContextualFragment',
            code: 'range.createContextualFragment("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to range.createContextualFragment for argument 0" }],
        },
        {
            name: 'document.write',
            code: 'document.write("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to document.write for argument 0" }],
        },
        {
            name: 'document.writeln',
            code: 'document.writeln("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to document.writeln for argument 0" }],
        },
        {
            name: 'setHTMLUnsafe',
            code: 'el.setHTMLUnsafe("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to el.setHTMLUnsafe for argument 0" }],
        },
        {
            name: 'import',
            code: 'import(userInput);',
            errors: [{ message: "Unsafe call to import for argument 0" }],
        },
    ],
});
