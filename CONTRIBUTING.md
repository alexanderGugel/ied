# Contributing to ied

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

This project adheres to the [Contributor Covenant 1.2](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report unacceptable behavior to [alexander.gugel@gmail.com](mailto:alexander.gugel@gmail.com).

The following is a set of guidelines for contributing to ied.
These are just guidelines, not rules, use your best judgment and feel free to
propose changes to this document in a pull request.

## Submitting Issues

* You can create an issue [here](https://github.com/alexanderGugel/ied/issues/new),
but before doing that please read the notes below and include as many details as
possible with your report. If you can, please include:
  * The version you're using
  * The operating system you are using
  * If applicable, what you were doing when the issue arose and what you
  expected to happen
* Other things that will help resolve your issue:
  * Error output that appears in your terminal, dev tools or as an alert
  * Perform a [cursory search](https://github.com/alexanderGugel/ied/issues?utf8=✓&q=is%3Aissue+)
  to see if a similar issue has already been submitted
  * Enable logging of specific parts of the project by setting the `NODE_ENV` environment variable

## Git Commit Messages

Please follow Torvald's [convention](https://github.com/torvalds/subsurface/blob/a48494d2fbed58c751e9b7e8fbff88582f9b2d02/README#L88). A good commit message looks like this:

```
  Header line: explain the commit in one line (use the imperative)

  Body of commit message is a few lines of text, explaining things
  in more detail, possibly giving some background about the issue
  being fixed, etc etc.

  The body of the commit message can be several paragraphs, and
  please do proper word-wrap and keep columns shorter than about
  74 characters or so. That way "git log" will show things
  nicely even when it's indented.

  Make sure you explain your solution and why you're doing what you're
  doing, as opposed to describing what you're doing. Reviewers and your
  future self can read the patch, but might not understand why a
  particular solution was implemented.
```

-------------------------------------------------------------------------------

Adapted from [github.com/atom/electron](https://github.com/atom/electron/blob/master/CONTRIBUTING.md).
