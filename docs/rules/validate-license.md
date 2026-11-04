# obsidianmd/validate-license

📝 Validate the structure of copyright notices in LICENSE files for Obsidian plugins.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

This rule catches the sample plugin's `LICENSE` left unedited. Its copyright line reads
`Copyright (C) 2020-2025 by Dynalist Inc.`.

- A copyright line whose holder is `Dynalist Inc.` is reported: change the holder to your name.
- While the holder is still `Dynalist Inc.`, a year (the last of a range) before the current year
  is reported too, unless `disableUnchangedYear` is set. `currentYear` sets the year to compare
  against; it defaults to the current year.

Not reported: a copyright line with any other holder, whatever its year.

- Your own notice does not have to carry the current year. Reporting every past year warned nearly
  every plugin, and again every 1 January, which breaks a `--max-warnings 0` build on a date.
- Some licence texts carry their author's own notice, such as
  `Copyright (C) 2007 Free Software Foundation, Inc.` at the top of the GPL, AGPL and LGPL. That
  line belongs to the licence text, which you must not edit.

Copyright lines are recognised in the forms `Copyright (C) 2020 by Name`,
`Copyright (c) 2020-2025 Name` and `Copyright © 2020 Name`. There is no fix.

The recommended config runs this rule on `LICENSE`, `LICENSE.md` and `LICENSE.txt` next to your
ESLint config; for a licence file under another name, see
[Files linted beyond your source](../configuration.md#files-linted-beyond-your-source).

## Options

<!-- begin auto-generated rule options list -->

| Name                   | Description                                                                   | Type    | Default |
| :--------------------- | :---------------------------------------------------------------------------- | :------ | :------ |
| `currentYear`          | The current year to compare an unedited sample-plugin copyright line against. | Number  |         |
| `disableUnchangedYear` | If true, do not report the year of an unedited sample-plugin copyright line.  | Boolean | `false` |

<!-- end auto-generated rule options list -->
