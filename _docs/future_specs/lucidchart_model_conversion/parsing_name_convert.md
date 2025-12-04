# Relevant Files

@editorextensions\quodsi_editor_extension\src\services\conversion\LucidPageConversionService.ts
@editorextensions\quodsi_editor_extension\src\core\messaging\handlers\modelOpsHandler.ts

@editorextensions\quodsi_editor_extension\src\core\StorageAdapter.ts
@editorextensions\quodsi_editor_extension\src\types\README.md
@editorextensions\quodsi_editor_extension\src\types\ActivityLucid.ts
# Overview
Lucid has the ability to use AI to generate diagrams within LucidChart.  FOr example, you can prompt it to build a diagram of an emergency department.  this is powerful!  

Quodsi leverages the page, block, or line shapeData to mapped a shape to a Quodsi simulation component.  Each type of simulation component, once mapped, stores a json string in the shapeData using keys of q_data and q_meta.

I was exploring the LLM support within LucidChart and prompted the LLM to use JSON structured string in the name it uses for shapes, lines, etc.  To my surprise, it did!  I prompted it to always include the following as a proof of concept:

name
duration (in minutes)
resource required

to my pleasant surprise, it worked.

In this chat, we have been working on the conversion code for which the name of the shape is already being utilized.  I would like to enhance the conversion code to try to parse the name field and if it detects a known structure, then deserialize it and leverages that deserialized information to replace that simulation components fields thus overwriting the typical defaults used.

After reviewing and thinking about feasability, if this is feasability, 

1. How might we phrase a LLM prompt what json schema it should use in the name?
2. How might we implement the deserialization of name of items and then intelligently populate them for persistence in quodsi?