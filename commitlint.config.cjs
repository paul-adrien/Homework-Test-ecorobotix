module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "test",
        "docs",
        "chore",
        "style",
        "perf",
        "build",
        "ci",
        "revert",
      ],
    ],
    "subject-case": [2, "never", ["upper-case"]],
  },
};
