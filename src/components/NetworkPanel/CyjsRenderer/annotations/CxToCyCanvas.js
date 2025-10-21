import {
  JAVA_LOGICAL_FONT_FAMILY_LIST,
  JAVA_LOGICAL_FONT_STACK_MAP,
} from './JavaLogicalFonts'
import { COMMON_OS_FONT_STACK_MAP } from './CommonFonts'

export class CxToCyCanvas {
  constructor() {
    var self = this

    this._findIntersection = function (p1, p2, p3, p4) {
      var denominator =
        (p4['y'] - p3['y']) * (p2['x'] - p1['x']) -
        (p4['x'] - p3['x']) * (p2['y'] - p1['y'])

      var ua =
        ((p4['x'] - p3['x']) * (p1['y'] - p3['y']) -
          (p4['y'] - p3['y']) * (p1['x'] - p3['x'])) /
        denominator

      var x = this._epsilon(p1['x'] + ua * (p2['x'] - p1['x']))
      var y = this._epsilon(p1['y'] + ua * (p2['y'] - p1['y']))
      return { x: x, y: y }
    }

    this._epsilon = function (v) {
      if (Math.abs(v) < 1.0e-10) return 0.0
      return v
    }

    this._circleX = function (sides, angle, rot) {
      var coeff = angle / sides
      if (rot && sides % 2 == 0) {
        if (sides == 8) {
          coeff += 0.5 / sides
        }
        return this._epsilon(Math.cos(2 * coeff * Math.PI))
      } else return this._epsilon(Math.cos(2 * coeff * Math.PI - Math.PI / 2))
    }

    this._circleY = function (sides, angle, rot) {
      var coeff = angle / sides
      if (rot && sides % 2 == 0) {
        if (sides == 8) {
          coeff += 0.5 / sides
        }
        return this._epsilon(Math.sin(2 * coeff * Math.PI))
      } else return this._epsilon(Math.sin(2 * coeff * Math.PI - Math.PI / 2))
    }

    this._regularPolygonShapeFunction = function (shapeMap, sides, ctx) {
      ctx.beginPath()
      var width = parseFloat(shapeMap['width']) / 2
      var height = parseFloat(shapeMap['height']) / 2

      var x = parseFloat(shapeMap['x']) + width
      var y = parseFloat(shapeMap['y']) + height

      var points = []
      for (let i = 0; i < sides; i++) {
        let x1 = this._circleX(sides, i, true) * width + x
        let y1 = this._circleY(sides, i, true) * height + y
        points.push({ x: x1, y: y1 })
      }
      // Now, add the points
      ctx.moveTo(points[0]['x'], points[0]['y'])
      for (let i = 1; i < sides; i++) {
        ctx.lineTo(points[i]['x'], points[i]['y'])
      }
      ctx.closePath()
      if (shapeMap['fillColor']) {
        let fillColor = self._colorFromInt(
          shapeMap['fillColor'],
          shapeMap['fillOpacity'],
        )
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      ctx.stroke()
    }

    this._starShapeFunction = function (shapeMap, sides, ctx) {
      ctx.beginPath()
      var width = parseFloat(shapeMap['width']) / 2
      var height = parseFloat(shapeMap['height']) / 2

      var x = parseFloat(shapeMap['x']) + width
      var y = parseFloat(shapeMap['y']) + height

      let nPoints = sides * 2
      var points = []
      for (let i = 0; i < nPoints; i++) {
        points.push({})
      }
      for (let i = 0; i < sides; i++) {
        let x1 = this._circleX(sides, i, false) * width + x
        let y1 = this._circleY(sides, i, false) * height + y
        let x2 = this._circleX(sides, (i + 2) % sides, false) * width + x
        let y2 = this._circleY(sides, (i + 2) % sides, false) * height + y
        points[i * 2] = { x: x1, y: y1 }
        points[(i * 2 + 4) % nPoints] = { x: x2, y: y2 }
      }

      // Fill in the intersection points
      for (let i = 0; i < nPoints; i = i + 2) {
        let p1 = i
        let p2 = (i + 4) % nPoints
        let p3 = (i + 2) % nPoints
        let p4 = (p3 + nPoints - 4) % nPoints

        points[(i + 1) % nPoints] = this._findIntersection(
          points[p1],
          points[p2],
          points[p3],
          points[p4],
        )
      }

      // Now, add the points
      ctx.moveTo(points[0]['x'], points[0]['y'])
      for (let i = 1; i < nPoints; i++) {
        ctx.lineTo(points[i]['x'], points[i]['y'])
      }
      ctx.closePath()

      if (shapeMap['fillColor']) {
        let fillColor = self._colorFromInt(
          shapeMap['fillColor'],
          shapeMap['fillOpacity'],
        )
        ctx.fillStyle = fillColor
        ctx.fill()
      }
      ctx.stroke()
    }

    this._scaleCustomPoint = function (value, min, max, scale) {
      return (scale * (min + value)) / (max - min)
    }

    this._quadraticCurveBoundingBox = function (x1, y1, x2, y2, x3, y3) {
      var brx, bx, x, bry, by, y, px, py

      // solve quadratic for bounds by BM67 normalizing equation
      brx = x3 - x1 // get x range
      bx = x2 - x1 // get x control point offset
      x = bx / brx // normalise control point which is used to check if maxima is in range

      // do the same for the y points
      bry = y3 - y1
      by = y2 - y1
      y = by / bry

      px = x1 // set defaults in case maximas outside range
      py = y1

      // find top/left, top/right, bottom/left, or bottom/right
      if (x < 0 || x > 1) {
        // check if x maxima is on the curve
        px = (bx * bx) / (2 * bx - brx) + x1 // get the x maxima
      }
      if (y < 0 || y > 1) {
        // same as x
        py = (by * by) / (2 * by - bry) + y1
      }

      let extent = {}
      extent.left = Math.min(x1, x3, px)
      extent.top = Math.min(y1, y3, py)
      extent.right = Math.max(x1, x3, px)
      extent.bottom = Math.max(y1, y3, py)

      extent.width = extent.right - extent.left
      extent.height = extent.bottom - extent.top

      return extent
    }

    this._evalBez = function (p0, p1, p2, p3, t) {
      var p =
        p0 * (1 - t) * (1 - t) * (1 - t) +
        3 * p1 * t * (1 - t) * (1 - t) +
        3 * p2 * t * t * (1 - t) +
        p3 * t * t * t
      return p
    }

    this._bezierCurveBoundingBox = function (
      px0,
      py0,
      px1,
      py1,
      px2,
      py2,
      px3,
      py3,
    ) {
      var a = 3 * px3 - 9 * px2 + 9 * px1 - 3 * px0
      var b = 6 * px0 - 12 * px1 + 6 * px2
      var c = 3 * px1 - 3 * px0
      //alert("a "+a+" "+b+" "+c);
      var disc = b * b - 4 * a * c
      var xl = px0
      var xh = px0
      if (px3 < xl) xl = px3
      if (px3 > xh) xh = px3
      if (disc >= 0) {
        let t1 = (-b + Math.sqrt(disc)) / (2 * a)
        //alert("t1 " + t1);
        if (t1 > 0 && t1 < 1) {
          var x1 = self._evalBez(px0, px1, px2, px3, t1)
          if (x1 < xl) xl = x1
          if (x1 > xh) xh = x1
        }

        let t2 = (-b - Math.sqrt(disc)) / (2 * a)
        //alert("t2 " + t2);
        if (t2 > 0 && t2 < 1) {
          var x2 = self._evalBez(px0, px1, px2, px3, t2)
          if (x2 < xl) xl = x2
          if (x2 > xh) xh = x2
        }
      }

      a = 3 * py3 - 9 * py2 + 9 * py1 - 3 * py0
      b = 6 * py0 - 12 * py1 + 6 * py2
      c = 3 * py1 - 3 * py0
      disc = b * b - 4 * a * c
      var yl = py0
      var yh = py0
      if (py3 < yl) yl = py3
      if (py3 > yh) yh = py3
      if (disc >= 0) {
        let t1 = (-b + Math.sqrt(disc)) / (2 * a)
        //alert("t3 " + t1);

        if (t1 > 0 && t1 < 1) {
          var y1 = self._evalBez(py0, py1, py2, py3, t1)
          if (y1 < yl) yl = y1
          if (y1 > yh) yh = y1
        }

        let t2 = (-b - Math.sqrt(disc)) / (2 * a)
        //alert("t4 " + t2);

        if (t2 > 0 && t2 < 1) {
          var y2 = self._evalBez(py0, py1, py2, py3, t2)
          if (y2 < yl) yl = y2
          if (y2 > yh) yh = y2
        }
      }

      let extent = {}
      extent.left = xl
      extent.top = yl
      extent.right = xh
      extent.bottom = yh

      extent.width = extent.right - extent.left
      extent.height = extent.bottom - extent.top

      return extent
    }

    this._shapeFunctions = {
      RECTANGLE: function (shapeMap, ctx) {
        ctx.beginPath()
        ctx.rect(
          shapeMap['x'],
          shapeMap['y'],
          shapeMap['width'],
          shapeMap['height'],
        )
        ctx.closePath()
        if (shapeMap['fillColor']) {
          let fillColor = self._colorFromInt(
            shapeMap['fillColor'],
            shapeMap['fillOpacity'],
          )
          ctx.fillStyle = fillColor
          ctx.fill()
        }
        ctx.stroke()
      },
      ROUNDEDRECTANGLE: function (shapeMap, ctx) {
        var width = parseFloat(shapeMap['width'])
        var height = parseFloat(shapeMap['height'])
        var tenthWidth = width * 0.1
        var x = parseFloat(shapeMap['x'])
        var y = parseFloat(shapeMap['y'])
        ctx.beginPath()

        ctx.moveTo(x + tenthWidth, y)
        ctx.lineTo(x + width - tenthWidth, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + tenthWidth)
        ctx.lineTo(x + width, y + height - tenthWidth)
        ctx.quadraticCurveTo(
          x + width,
          y + height,
          x + width - tenthWidth,
          y + height,
        )
        ctx.lineTo(x + tenthWidth, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - tenthWidth)
        ctx.lineTo(x, y + tenthWidth)
        ctx.quadraticCurveTo(x, y, x + tenthWidth, y)
        ctx.closePath()
        if (shapeMap['fillColor']) {
          let fillColor = self._colorFromInt(
            shapeMap['fillColor'],
            shapeMap['fillOpacity'],
          )
          ctx.fillStyle = fillColor
          ctx.fill()
        }
        ctx.stroke()
      },
      ELLIPSE: function (shapeMap, ctx) {
        var halfWidth = parseFloat(shapeMap['width']) / 2
        var halfHeight = parseFloat(shapeMap['height']) / 2
        var x = parseFloat(shapeMap['x']) + halfWidth
        var y = parseFloat(shapeMap['y']) + halfHeight
        ctx.beginPath()
        ctx.ellipse(x, y, halfWidth, halfHeight, 0, 0, 2 * Math.PI)
        ctx.closePath()
        if (shapeMap['fillColor']) {
          let fillColor = self._colorFromInt(
            shapeMap['fillColor'],
            shapeMap['fillOpacity'],
          )
          ctx.fillStyle = fillColor
          ctx.fill()
        }
        ctx.stroke()
      },
      STAR5: function (shapeMap, ctx) {
        self._starShapeFunction(shapeMap, 5, ctx)
      },
      STAR6: function (shapeMap, ctx) {
        self._starShapeFunction(shapeMap, 6, ctx)
      },
      TRIANGLE: function (shapeMap, ctx) {
        self._regularPolygonShapeFunction(shapeMap, 3, ctx)
      },
      PENTAGON: function (shapeMap, ctx) {
        self._regularPolygonShapeFunction(shapeMap, 5, ctx)
      },
      HEXAGON: function (shapeMap, ctx) {
        self._regularPolygonShapeFunction(shapeMap, 6, ctx)
      },
      OCTAGON: function (shapeMap, ctx) {
        self._regularPolygonShapeFunction(shapeMap, 8, ctx)
      },
      PARALLELOGRAM: function (shapeMap, ctx) {
        var x = parseFloat(shapeMap['x'])
        var y = parseFloat(shapeMap['y'])

        var xMax = x + parseFloat(shapeMap['width'])
        var yMax = y + parseFloat(shapeMap['height'])
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo((2.0 * xMax + x) / 3.0, y)
        ctx.lineTo(xMax, yMax)
        ctx.lineTo((2.0 * x + xMax) / 3.0, yMax)
        ctx.closePath()
        if (shapeMap['fillColor']) {
          let fillColor = self._colorFromInt(
            shapeMap['fillColor'],
            shapeMap['fillOpacity'],
          )
          ctx.fillStyle = fillColor
          ctx.fill()
        }
      },
      CUSTOM: function (shapeMap, ctx) {
        const customShape = shapeMap['customShape']
        if (customShape) {
          var x = parseFloat(shapeMap['x'])
          var y = parseFloat(shapeMap['y'])

          var width = parseFloat(shapeMap['width'])
          var height = parseFloat(shapeMap['height'])

          var shapeArgs = customShape.split(' ')

          let minX = Number.MAX_VALUE
          let minY = Number.MAX_VALUE

          let maxX = Number.MIN_VALUE
          let maxY = Number.MIN_VALUE

          let lastX
          let lastY

          for (let i = 0; i < shapeArgs.length; i++) {
            if (shapeArgs[i] == 'M') {
              let mx = parseFloat(shapeArgs[i + 1])
              let my = parseFloat(shapeArgs[i + 2])
              minX = Math.min(minX, mx)
              minY = Math.min(minY, my)
              maxX = Math.max(maxX, mx)
              maxY = Math.max(maxY, my)
              lastX = mx
              lastY = my
              i += 2
            } else if (shapeArgs[i] == 'L') {
              let lx = parseFloat(shapeArgs[i + 1])
              let ly = parseFloat(shapeArgs[i + 2])
              minX = Math.min(minX, lx)
              minY = Math.min(minY, ly)
              maxX = Math.max(maxX, lx)
              maxY = Math.max(maxY, ly)
              lastX = lx
              lastY = ly
              i += 2
            } else if (shapeArgs[i] == 'Q') {
              let q1 = parseFloat(shapeArgs[i + 1])
              let q2 = parseFloat(shapeArgs[i + 2])
              let q3 = parseFloat(shapeArgs[i + 3])
              let q4 = parseFloat(shapeArgs[i + 4])

              let extent = self._quadraticCurveBoundingBox(
                lastX,
                lastY,
                q1,
                q2,
                q3,
                q4,
              )

              minX = Math.min(minX, extent.left)
              minX = Math.min(minX, extent.right)

              minY = Math.min(minY, extent.bottom)
              minY = Math.min(minY, extent.top)

              maxX = Math.max(maxX, extent.left)
              maxX = Math.max(maxX, extent.right)

              maxY = Math.max(maxY, extent.bottom)
              maxY = Math.max(maxY, extent.top)

              lastX = q3
              lastY = q4

              i += 4
            } else if (shapeArgs[i] == 'C') {
              let c1 = parseFloat(shapeArgs[i + 1])
              let c2 = parseFloat(shapeArgs[i + 2])
              let c3 = parseFloat(shapeArgs[i + 3])
              let c4 = parseFloat(shapeArgs[i + 4])
              let c5 = parseFloat(shapeArgs[i + 5])
              let c6 = parseFloat(shapeArgs[i + 6])

              let extent = self._bezierCurveBoundingBox(
                lastX,
                lastY,
                c1,
                c2,
                c3,
                c4,
                c5,
                c6,
              )

              minX = Math.min(minX, extent.left)
              minX = Math.min(minX, extent.right)

              minY = Math.min(minY, extent.bottom)
              minY = Math.min(minY, extent.top)

              maxX = Math.max(maxX, extent.left)
              maxX = Math.max(maxX, extent.right)

              maxY = Math.max(maxY, extent.bottom)
              maxY = Math.max(maxY, extent.top)

              lastX = c5
              lastY = c6

              i += 6
            }
          }

          let scaleX = width / (maxX - minX)
          let scaleY = height / (maxY - minY)

          let baseX = x - scaleX * minX
          let baseY = y - scaleY * minY

          ctx.beginPath()

          for (let i = 0; i < shapeArgs.length; i++) {
            if (shapeArgs[i] == 'NZ') {
              ctx.closePath()
              ctx.beginPath()
              ctx.mozFillRule = 'nonzero'
            } else if (shapeArgs[i] == 'EO') {
              ctx.closePath()
              ctx.beginPath()
              ctx.mozFillRule = 'evenodd'
            } else if (shapeArgs[i] == 'M') {
              let mx = baseX + scaleX * parseFloat(shapeArgs[i + 1])
              let my = baseY + scaleY * parseFloat(shapeArgs[i + 2])
              ctx.moveTo(mx, my)
              i += 2
            } else if (shapeArgs[i] == 'L') {
              let lx = baseX + scaleX * parseFloat(shapeArgs[i + 1])
              let ly = baseY + scaleY * parseFloat(shapeArgs[i + 2])
              ctx.lineTo(lx, ly)
              i += 2
            } else if (shapeArgs[i] == 'Q') {
              let q1 = baseX + scaleX * parseFloat(shapeArgs[i + 1])
              let q2 = baseY + scaleY * parseFloat(shapeArgs[i + 2])
              let q3 = baseX + scaleX * parseFloat(shapeArgs[i + 3])
              let q4 = baseY + scaleY * parseFloat(shapeArgs[i + 4])
              ctx.quadraticCurveTo(q1, q2, q3, q4)
              i += 4
            } else if (shapeArgs[i] == 'C') {
              let c1 = baseX + scaleX * parseFloat(shapeArgs[i + 1])
              let c2 = baseY + scaleY * parseFloat(shapeArgs[i + 2])
              let c3 = baseX + scaleX * parseFloat(shapeArgs[i + 3])
              let c4 = baseY + scaleY * parseFloat(shapeArgs[i + 4])
              let c5 = baseX + scaleX * parseFloat(shapeArgs[i + 5])
              let c6 = baseY + scaleY * parseFloat(shapeArgs[i + 6])
              ctx.bezierCurveTo(c1, c2, c3, c4, c5, c6)
              i += 6
            } else if (shapeArgs[i] == 'Z') {
              //ctx.beginPath();
            }
          }
          ctx.closePath()
          if (shapeMap['fillColor']) {
            let fillColor = self._colorFromInt(
              shapeMap['fillColor'],
              shapeMap['fillOpacity'],
            )
            ctx.fillStyle = fillColor
            ctx.fill()
          }
          ctx.stroke()
        }
      },
    }

    this._colorFromInt = function (num, alpha) {
      num >>>= 0
      var b = num & 0xff,
        g = (num & 0xff00) >>> 8,
        r = (num & 0xff0000) >>> 16,
        a = parseFloat(alpha) / 100

      return 'rgb(' + r + ',' + g + ',' + b + ',' + a + ')'
    }
  }

  drawBackground(cytoscapeInstance, cxBGColor) {
    const backgroundLayer = cytoscapeInstance.cyCanvas({
      zIndex: -2,
    })

    const backgroundCanvas = backgroundLayer.getCanvas()
    const backgroundCtx = backgroundCanvas.getContext('2d')

    cytoscapeInstance.on('render cyCanvas.resize', (evt) => {
      backgroundCtx.fillStyle = cxBGColor
      backgroundCtx.fillRect(
        0,
        0,
        backgroundCanvas.width,
        backgroundCanvas.height,
      )
    })
  }

  getAnnotationElementsFromNiceCX(niceCX) {
    if (niceCX['networkAttributes']) {
      return niceCX['networkAttributes']['elements'].filter(function (element) {
        return element['n'] == '__Annotations'
      })
    } else {
      return []
    }
  }

  drawAnnotationsFromAnnotationElements(cytoscapeInstance, annotationElements) {
    //console.log("setting up annotations");
    const bottomLayer = cytoscapeInstance.cyCanvas({
      zIndex: -1,
    })

    const topLayer = cytoscapeInstance.cyCanvas({
      zIndex: 1,
    })

    const bottomCanvas = bottomLayer.getCanvas()
    const bottomCtx = bottomCanvas.getContext('2d')

    const topCanvas = topLayer.getCanvas()
    const topCtx = topCanvas.getContext('2d')

    this.topLayer = topLayer
    this.bottomLayer = bottomLayer

    cytoscapeInstance.on('render cyCanvas.resize', (evt) => {
      var colorFromInt = this._colorFromInt
      var shapeFunctions = this._shapeFunctions
      //console.log("render cyCanvas.resize event");
      bottomLayer.resetTransform(bottomCtx)
      bottomLayer.clear(bottomCtx)
      bottomLayer.setTransform(bottomCtx)

      bottomCtx.save()

      topLayer.resetTransform(topCtx)
      topLayer.clear(topCtx)
      topLayer.setTransform(topCtx)

      topCtx.save()

      var indexedAnnotations = {}
      var topAnnotations = []
      var bottomAnnotations = []

      annotationElements.forEach(function (element) {
        element['v'].forEach(function (annotation) {
          var annotationKVList = annotation.split('|')
          var annotationMap = {}
          annotationKVList.forEach(function (annotationKV) {
            var kvPair = annotationKV.split('=')
            annotationMap[kvPair[0]] = kvPair[1]
          })

          indexedAnnotations[annotationMap['uuid']] = annotationMap

          if (annotationMap['canvas'] == 'foreground') {
            topAnnotations.push(annotationMap['uuid'])
          } else {
            bottomAnnotations.push(annotationMap['uuid'])
          }
        })
      })
      var zOrderCompare = function (a, b) {
        let annotationA = indexedAnnotations[a]
        let annotationB = indexedAnnotations[b]
        return parseInt(annotationB['z']) - parseInt(annotationA['z'])
      }

      topAnnotations.sort(zOrderCompare)
      bottomAnnotations.sort(zOrderCompare)

      var contextAnnotationMap = [
        { context: topCtx, annotations: topAnnotations },
        { context: bottomCtx, annotations: bottomAnnotations },
      ]
      contextAnnotationMap.forEach(function (contextAnnotationPair) {
        let ctx = contextAnnotationPair.context
        contextAnnotationPair.annotations.forEach(function (annotationUUID) {
          let annotationMap = indexedAnnotations[annotationUUID]
          if (
            annotationMap['type'] ==
              'org.cytoscape.view.presentation.annotations.ShapeAnnotation' ||
            annotationMap['type'] ==
              'org.cytoscape.view.presentation.annotations.BoundedTextAnnotation'
          ) {
            //ctx.beginPath();
            const zoom = annotationMap['zoom']
              ? parseFloat(annotationMap['zoom'])
              : 1

            ctx.lineWidth = annotationMap['edgeThickness']

            annotationMap['width'] = parseFloat(annotationMap['width']) / zoom
            annotationMap['height'] = parseFloat(annotationMap['height']) / zoom
            if (shapeFunctions[annotationMap['shapeType']]) {
              ctx.strokeStyle = colorFromInt(
                annotationMap['edgeColor'],
                annotationMap['edgeOpacity'],
              )
              shapeFunctions[annotationMap['shapeType']](annotationMap, ctx)

              //ctx.stroke();
            } else {
              console.warn('Invalid shape type: ' + annotationMap['shapeType'])
            }
          } else if (
            annotationMap['type'] ==
            'org.cytoscape.view.presentation.annotations.ArrowAnnotation'
          ) {
            if (
              annotationMap['targetAnnotation'] &&
              annotationMap['sourceAnnotation']
            ) {
              let sourceAnnotation =
                indexedAnnotations[annotationMap['sourceAnnotation']]
              let targetAnnotation =
                indexedAnnotations[annotationMap['targetAnnotation']]

              // The following is a start to implementing arrow annotations. To follow Cytoscape's
              // implementation, it would take a great deal of math and special cases, so has been
              // left for later work.
              /*
                    ctx.beginPath();
                    
                    let sourceX = sourceAnnotation['x'];
                    let sourceY = sourceAnnotation['y'];

                    let targetX = targetAnnotation['x'];
                    let targetY = targetAnnotation['y'];

                    ctx.moveTo(sourceX, sourceY);
                    ctx.lineTo(targetX, targetY);

                    ctx.closePath();
                   */
              ctx.stroke()
            }
          }

          var text
          var textX
          var textY

          if (
            annotationMap['type'] ==
            'org.cytoscape.view.presentation.annotations.TextAnnotation'
          ) {
            text = annotationMap['text']
            ctx.textBaseline = 'top'
            ctx.textAlign = 'left'
            textX = annotationMap['x']
            textY = annotationMap['y']
          } else if (
            annotationMap['type'] ==
            'org.cytoscape.view.presentation.annotations.BoundedTextAnnotation'
          ) {
            text = annotationMap['text']

            ctx.textBaseline = 'middle'
            ctx.textAlign = 'center'

            textX = parseFloat(annotationMap['x']) + annotationMap['width'] / 2
            textY = parseFloat(annotationMap['y']) + annotationMap['height'] / 2
          }
          if (text && textX && textY) {
            const zoom = annotationMap['zoom']
              ? parseFloat(annotationMap['zoom'])
              : 1
            const fontSize = parseFloat(annotationMap['fontSize']) / zoom
            var fontFamily

            if (annotationMap['fontFamily']) {
              if (
                JAVA_LOGICAL_FONT_FAMILY_LIST.includes(
                  annotationMap['fontFamily'],
                )
              ) {
                fontFamily =
                  JAVA_LOGICAL_FONT_STACK_MAP[annotationMap['fontFamily']]
              } else if (
                COMMON_OS_FONT_STACK_MAP[annotationMap['fontFamily']]
              ) {
                fontFamily =
                  COMMON_OS_FONT_STACK_MAP[annotationMap['fontFamily']]
              } else {
                fontFamily = 'sans-serif'
              }
            }
            ctx.font = fontSize + 'px ' + fontFamily

            if (annotationMap['color']) {
              let fillColor = colorFromInt(annotationMap['color'], '100')
              ctx.fillStyle = fillColor
            }
            ctx.fillText(text.toString(), textX, textY)
          }
        })
      })

      topCtx.restore()
      bottomCtx.restore()
    })

    return {
      topLayer: topLayer,
      bottomLayer: bottomLayer,
    }
  }

  drawAnnotationsFromNiceCX(cytoscapeInstance, niceCX) {
    const annotationElements = this.getAnnotationElementsFromNiceCX(niceCX)
    return this.drawAnnotationsFromAnnotationElements(
      cytoscapeInstance,
      annotationElements,
    )
  }

  clearAnnotationsFromCanvas() {
    if (self.topLayer !== undefined) {
      self.topLayer.clear()
    }
    if (self.bottomLayer !== undefined) {
      self.bottomLayer.clear()
    }
  }
}
