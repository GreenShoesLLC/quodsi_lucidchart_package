# Tailwind CSS Style Guide for Quodsi React Components

This document catalogs common Tailwind CSS patterns used throughout the project to maintain consistent styling.

## Container Styles

### Main Panel Container
```
flex flex-col h-full bg-white shadow-md rounded-sm overflow-hidden border border-gray-200
```

### Card Container
```
bg-white p-6 rounded-lg shadow-sm border border-gray-200
```

### Section Container (with gradient)
```
p-4 space-y-3 border-b bg-gradient-to-r from-blue-50 to-white shadow-sm
```

## Button Styles

### Primary Button
```
px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium
```

### Secondary Button
```
px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 rounded-md transition-colors border border-blue-100 font-medium
```

### Danger Button
```
px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm font-medium
```

### Success Button
```
px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium
```

### Button Base (for composing)
```
px-3 py-2 min-w-[110px] flex justify-center items-center h-9 text-sm font-medium rounded-md shadow-sm transition-colors
```

### Disabled Button
```
opacity-50 cursor-not-allowed
```

## Form Element Styles

### Input Field
```
text-sm p-2 border border-gray-300 rounded-md flex-grow shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none
```

### Select Field
```
w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white
```

### Form Label
```
text-sm text-gray-600 font-medium
```

## Status Indicators

### Status Indicator Base
```
inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm
```

### Success Status
```
bg-green-100 text-green-700 border border-green-200
```

### Warning Status
```
bg-yellow-100 text-yellow-700 border border-yellow-200
```

### Error Status
```
bg-red-100 text-red-700 border border-red-200
```

### Info Status
```
bg-blue-100 text-blue-700 border border-blue-200
```

## Accordion Section

### Accordion Header
```
w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50
```

### Accordion Content
```
p-4 border-t border-gray-200 bg-white
```

## Typography

### Panel Title
```
text-lg font-semibold text-gray-800
```

### Section Heading
```
text-sm font-medium text-gray-700
```

### Label Text
```
text-sm text-gray-600 font-medium
```

### Small Text
```
text-xs text-gray-500
```

## Notification Styles

### Alert Base
```
p-4 mb-3 rounded-r-md shadow-sm
```

### Error Alert
```
bg-red-50 border-l-4 border-red-500 text-red-700
```

### Warning Alert
```
bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700
```

### Info Alert
```
bg-blue-50 border-l-4 border-blue-500 text-blue-700
```

## Spacing Patterns

- Card/section padding: `p-4`
- Stacked elements spacing: `space-y-3` or `space-y-4` 
- Gap between horizontally arranged elements: `gap-3`
- Input fields vertical padding: `py-2`
- Input fields horizontal padding: `px-3`
