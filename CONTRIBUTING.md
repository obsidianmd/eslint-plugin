We're still experimenting with contributions, if you have any questions, please hop onto the [#ESLint plugin thread under #plugin-dev channel](https://discord.com/channels/686053708261228577/1379041736315240518) on our Discord.

You have to agree to the [Contributor License Agreement](https://github.com/obsidianmd/obsidian-releases/blob/master/cla.md) which grants Obsidian the license to use your code.

### Code standards

- Keep it lightweight. The fewer the dependencies, the better. For example, please do not import `lodash` to use two functions from it.
- Your code should be self-explanatory. Class and function names should explain most things, but you should add comments for anything non-obvious. Also add examples in your comments to describe any unusual conversion that has to be done.

### Tests and generated docs

Run `npm ci`, then `npm run build` and `npm test`. The configs and rules lists in
[README.md](README.md) and the header and options list of each rule's page under `docs/rules/` are
generated from the rules: after adding or changing a rule, run `npm run build` and then
`npm run update:eslint-docs`, or, for a new rule, `npm run init:eslint-docs`, which also creates its
page. CI runs `npm test` on Node.js 20, 22 and 24, and `npm run check:eslint-docs`, which fails when
the generated docs are out of date.

### Changelog

Every pull request adds an entry to [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]`, in the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) section that fits (`Added`, `Changed`,
`Fixed`, and so on), with a link to the pull request. A CI check fails pull requests that do not
touch `CHANGELOG.md`. For changes that need no entry, such as CI or test-only changes, a maintainer
adds the `skip-changelog` label; Dependabot pull requests, labelled `dependencies`, are skipped
automatically.
