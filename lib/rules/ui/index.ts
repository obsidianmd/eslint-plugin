import sentenceCase from "./sentenceCase.js";
import sentenceCaseJson from "./sentenceCaseJson.js";
import sentenceCaseLocaleModule from "./sentenceCaseLocaleModule.js";

// Annotated so the emitted declaration names the rules by their own modules.
// Inferred, it spells out sentenceCaseJson's type, which TypeScript can only
// name through @eslint/plugin-kit's internal types file, and with the
// tsconfig's baseUrl it wrote that as "node_modules/@eslint/plugin-kit/...".
export const ui: {
    sentenceCase: typeof sentenceCase;
    sentenceCaseJson: typeof sentenceCaseJson;
    sentenceCaseLocaleModule: typeof sentenceCaseLocaleModule;
} = {
    sentenceCase,
    sentenceCaseJson,
    sentenceCaseLocaleModule,
};

