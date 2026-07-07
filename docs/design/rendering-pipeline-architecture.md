# Rendering Pipeline Architecture

This document maps out the exhaustive list of files involved in the Cytoscape Web rendering pipeline, categorized by their architectural role. 

This serves as a reference for the current rendering boundaries and can be used as a blueprint for future efforts to extract and decouple the rendering engine from the application state into a standalone rendering library.

### 1. View Model Definitions & Computation
This layer calculates the exact visual properties for each element, producing a framework-agnostic `ViewModel`.

**Types & Interfaces:**
* `src/models/ViewModel/View.ts`
* `src/models/ViewModel/NodeView.ts`
* `src/models/ViewModel/EdgeView.ts`
* `src/models/ViewModel/NetworkView.ts`
* `src/models/ViewModel/index.ts`

**Computation Engines:**
* `src/models/ViewModel/impl/viewModelImpl.ts`
* `src/models/VisualStyleModel/impl/computeViewUtil.ts`
* `src/models/VisualStyleModel/impl/customGraphicsImpl.ts`
* `src/models/VisualStyleModel/impl/nodeLabelPositionMap.ts`
* `src/models/CxModel/impl/converters/viewModelConverter.ts`

### 2. Translation to Cytoscape.js Formats
This layer translates the framework-agnostic `ViewModel` into Cytoscape.js CSS and element structures.

**Style Converters:**
* `src/models/VisualStyleModel/impl/cyJsVisualPropertyConverter.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/cyjsVisualPropertyName.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/cyjsShape.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/cyjsMappingFn.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/index.ts`

**Internal Mapper Utilities:**
* `src/models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/cyjsDirectMapper.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/dataMapper.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/directMappingSelector.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/selectorType.ts`
* `src/models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/index.ts`

### 3. The Cytoscape.js Renderer & DOM Manipulation
This layer contains the actual Cytoscape instance, handles the DOM/Canvas, and syncs UI events back to your app.

**React Wrapper & Event Handlers:**
* `src/features/NetworkPanel/CyjsRenderer/CyjsRenderer.tsx`
* `src/features/NetworkPanel/CyjsRenderer/index.ts`
* `src/features/NetworkPanel/CyjsRenderer/cyjsFactoryUtil.ts`
* `src/features/NetworkPanel/CyjsRenderer/cyjsRenderUtil.ts`
* `src/features/NetworkPanel/CyjsRenderer/registerCyExtensions.ts`

**Sub-Components & Overlays:**
* `src/features/NetworkPanel/CyjsRenderer/NetworkContextMenu.tsx`
* `src/features/NetworkPanel/CyjsRenderer/NodeCreationDialog.tsx`
* `src/features/NetworkPanel/CyjsRenderer/EdgeCreationDialog.tsx`

**Canvas Annotations (Legacy/Custom Rendering):**
* `src/features/NetworkPanel/CyjsRenderer/annotations/cyjsAnnotationRenderer.js`
* `src/features/NetworkPanel/CyjsRenderer/annotations/CommonFonts.ts`
* `src/features/NetworkPanel/CyjsRenderer/annotations/JavaLogicalFonts.ts`

### 4. Layout Engine
Layouts are inherently tied to the Cytoscape.js engine in this architecture and would need to move with the renderer.

**Algorithms:**
* `src/models/LayoutModel/impl/Cyjs/cyjsLayout.ts`
* `src/models/LayoutModel/impl/Cyjs/Algorithms/cyjsAlgorithms.ts`
* `src/models/LayoutModel/impl/Cyjs/Algorithms/circle.ts`
* `src/models/LayoutModel/impl/Cyjs/Algorithms/concentric.ts`
* `src/models/LayoutModel/impl/Cyjs/Algorithms/cose.ts`
* `src/models/LayoutModel/impl/Cyjs/Algorithms/grid.ts`
