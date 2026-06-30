# ai-coder

## Overview

AI-Coder is a graphical tool that manages AI-generated codebases stored in github or gitlab. It interfaces with AI models to write code, to make pull requests, perform code reviews, and merge. It watches issues and fixes issues automatically. It regularly updates documentation.

The interface has a pane on the left where projects being managed are itemized, and a pane on the right that shows more meaningful content. The pane on the left is a vertical list of projects with a small status icon that indicates what's going on with the project right now. The pane on the right shows things like open issues, open PRs, and AI costs associated.

There is a settings window where connection information for the AI models is specified, along with keys for github, gitlab, and the model providers. You can specify a model for coding, a model for code reviews, a model for architectural reviews, and a model for writing documentation. The settings can be overridden on a per-project basis.

## Technical

The tool should be written in electronjs so it can work with MacOS or Windows. It should be statically built.
