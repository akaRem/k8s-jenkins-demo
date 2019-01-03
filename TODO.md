# TODO list

This repo represents sample demo, but it still could be reused as starting point
for CI testing framework. Here are some TODO items which should be implemented.

- Rework js implementation for services.
  - Extract k8s and helm as infrastructure provider.
  - Make providers customizable for different environment.
- Reduce hardcoding.
- Use tempdirs instead of project workspace.
- Improve Jenkins.
  - Turn on authorization and add token issue impl.
  - Add endpoints for GitLab notifications.
  - Add impl for acting as other users than admin.
- Improve GitLab.
  - Add impl for review creation.
  - Add impl for acting as other users than root.
- Get rid of spawn commands and use api implementations where it's possible.
- Improve error handling.
- Improve test coverage.
- Add partial support for custom YAML tags — JJB allows to use custom tags in YAML documents and it's very useful — so this should be supported somehow, otherwise YAML documents will become unreadable.
- drop shell scripts.
