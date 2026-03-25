import { RuleTester } from "eslint";
import noUnsanitizedPlugin from "eslint-plugin-no-unsanitized";

const ruleTester = new RuleTester();

ruleTester.run("property", noUnsanitizedPlugin.rules.property, {
    valid: [
        { code: 'el.textContent = "safe";' },
        { code: 'el.textContent = variable;' },
        { code: 'el.className = "my-class";' },
        { code: 'document.title = "Hello";' },
    ],
    invalid: [
        {
            code: 'el.innerHTML = "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            code: 'el.innerHTML += "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            code: 'el.innerHTML ||= userInput;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            code: 'el.innerHTML &&= userInput;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            code: 'el.innerHTML ??= userInput;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            code: 'el.innerHTML = `<div>${userInput}</div>`;',
            errors: [{ message: "Unsafe assignment to innerHTML" }],
        },
        {
            code: 'el.outerHTML = "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to outerHTML" }],
        },
        {
            code: 'el.outerHTML += "<div>" + userInput + "</div>";',
            errors: [{ message: "Unsafe assignment to outerHTML" }],
        },
    ],
});

ruleTester.run("method", noUnsanitizedPlugin.rules.method, {
    valid: [
        { code: 'document.createElement("div");' },
        { code: 'el.setAttribute("class", "safe");' },
        { code: 'el.appendChild(child);' },
    ],
    invalid: [
        {
            code: 'el.insertAdjacentHTML("beforeend", "<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to el.insertAdjacentHTML for argument 1" }],
        },
        {
            code: 'range.createContextualFragment("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to range.createContextualFragment for argument 0" }],
        },
        {
            code: 'document.write("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to document.write for argument 0" }],
        },
        {
            code: 'document.writeln("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to document.writeln for argument 0" }],
        },
        {
            code: 'el.setHTMLUnsafe("<div>" + userInput + "</div>");',
            errors: [{ message: "Unsafe call to el.setHTMLUnsafe for argument 0" }],
        },
        {
            code: 'import(userInput);',
            errors: [{ message: "Unsafe call to import for argument 0" }],
        },
    ],
});
