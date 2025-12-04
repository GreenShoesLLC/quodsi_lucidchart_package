# Relevant Files

@editorextensions\quodsi_editor_extension\src\services\conversion\LucidPageConversionService.ts

@editorextensions\quodsi_editor_extension\quodsim-react\src\features\modelPanel\ModelPanel.tsx

@editorextensions\quodsi_editor_extension\quodsim-react\src\features\LucidApp.tsx

@editorextensions\quodsi_editor_extension\quodsim-react\src\messaging\senders\modelOpsSender.ts

@shared\src\quodsi-messaging\envelope\envelopeMessageTypes.ts

@editorextensions\quodsi_editor_extension\src\core\messaging\handlers\modelOpsHandler.ts

@editorextensions\quodsi_editor_extension\src\core\messaging\handlers\modelOpsHandler.ts

handleConvert

# Overview
Quodsi contains the ability to convert a Lucidchart diagram to a Quodsi model.

In the current code, a check is made on the LucidChart active page for shapeData properties containing Quodsi keys.  If those keys exist, then Quodsi shows a button the user can push to convert the diagram shapes and lines and page to Quodsi.  Conversion is simply adding keys to shapeData.

The foundational conversion code is LucidPageConversionService.convertPage
@editorextensions\quodsi_editor_extension\src\services\conversion\LucidPageConversionService.ts

# Current Limitations
In the current code, once the button is pushed, the code executes instantly.  There is not an option to preview what simulation component each shape has been mapped to (None, Activity, Generator, Resource, Connector, Model, etc).  It would be nice for a user to be able to see this and potentially change it.

In the current design, converting is all or nothing.  Once a Page has been converted to a Model, then the ability to convert is no longer option.  It would be nice to see a list of shapes, what they are currently mapped to and apply new mappings on tops of an already previously converted diagram.  A common use case I can think of are Lucidchart Lines.  Users often forget that lines need to be converted to a Connector sim component.  It would be nice to be able to do that in bulk.

Since Quodsi has not been released yet, versioning has not been an issue.  However, I can see an issue of needing to convert old quodsi data to new quodsi version.  This utility might serve as a good conversion utility as well.

# Goals

- Add a preview page where the user 