// core-serp-vitals
// @defaced
(function () {
  // Make sure nothing has been previously injected, and the API key has been set.
  if (window.cruxKey === 'undefined' || document.getElementById('serp-styles')) { return }

  // Discover dark mode settings
  if (document.querySelector('meta[name="color-scheme"][content="dark"]')) {
    document.body.classList.add('color_theme--dark')
  }
  const css = `
    <style id="serp-styles">
    /* Standard styles */
    .serp-vitals {color: #4d5156; font-size: .75rem;}
    .serp-vitals .red {color: #ff4e42}
    .serp-vitals .green {color: #0cce6b}
    .serp-vitals .orange {color: #ffa400}
    .serp-vitals:before {
      content: 'Core Web Vitals';
      color: #b9bcbf;
    }
    .serp-vitals.serp-vitals--experimental:before {
      content: 'Experimental';
   }
    .serp-vitals {
      border: 1px solid #dadce0;
      border-radius: 3px;
      width: max-content;
      padding: 1px 4px 2px;
      display:inline-block;
       /* Added to fix the direction and transform issues */ 
      transform: scaleY(-1) !important;
    }
    .serp-vitals .serp-vitals-tag {
      border: 1px solid #81868a;
      border-radius: 2px;
      padding: 0 4px;
      font-size: 10px;
      margin-left: 4px;
      margin-right: 4px;
      display: inline-block;
    }

    /* Dark mode styles */
    .color_theme--dark .serp-vitals {
      border: 1px solid #3c4043;
      color: #969ba1;
    }
    .color_theme--dark .serp-vitals:before{
      color: #3c4043;
    }
    </style>
  `
  document.body.insertAdjacentHTML('beforeend', css)

  const crux = require('crux-api/batch')
  const batch = crux.createBatch({ key: window.cruxKey })

  const urls = []
  // Select the links on the page.
  // Update  to 2025 Google Search elements
  let serpArray = [...document.querySelectorAll('#rso .MjjYud .A6K0A a[data-ved][href^="http"]')]

  // Filter media elements from the array by removing any link with an explicity width set.
  serpArray = serpArray.filter(e => !e.style.width)

  // Filter large media elements by looking for a height on the parent.
  serpArray = serpArray.filter(e => !e.parentElement.style.height)

  // Filter Youtube links.
  // Remove when Crux supports query parameters.
  serpArray = serpArray.filter(e => !e.href.includes('youtube.com/watch') && !e.href.includes('youtube.com/shorts') && !e.href.includes('youtube.com/embed'));

  serpArray.forEach(e => {
    urls.push(e.getAttribute('href'))
  })

  const records = async () => {
    if (!urls.length) return []
    if (window.vitalsLevel === 'ORIGIN') {
      return await batch(urls.map(origin => ({ origin, formFactor: window.vitalsDevice })))
    }

    return await batch(urls.map(url => ({ url, formFactor: window.vitalsDevice })))
  }

  const constraints = {
    lcp: { min: 2.5, max: 4 },
    cls: { min: 0.1, max: 0.25 },
    inp: { min: 0.2, max: 0.5 },
    ttfb: { min: 0.8, max: 1.8 }
  }

  const getColor = (type, score) => {
    if (score === 'N/A') { return '' }
    if (score > constraints[type].max) {
      return 'red'
    }
    if (score > constraints[type].min) {
      return 'orange'
    }
    return 'green'
  }

  records().then(metrics => {
    metrics.forEach(metric => {
      if (metric !== null) {
        if (!metric.record.metrics.largest_contentful_paint) {
          metric.record.metrics.largest_contentful_paint = { percentiles: { p75: 'N/A' } }
        } else {
          metric.record.metrics.largest_contentful_paint.percentiles.p75 /= 1000
        }

        if (!metric.record.metrics.cumulative_layout_shift) {
          metric.record.metrics.cumulative_layout_shift = { percentiles: { p75: 'N/A' } }
        }

        if (!metric.record.metrics.interaction_to_next_paint) {
          metric.record.metrics.interaction_to_next_paint = { percentiles: { p75: 'N/A' } }
        } else {
          metric.record.metrics.interaction_to_next_paint.percentiles.p75 /= 1000
        }

        if (!metric.record.metrics.time_to_first_byte) {
          metric.record.metrics.time_to_first_byte = { percentiles: { p75: 'N/A' } }
        } else {
          metric.record.metrics.time_to_first_byte.percentiles.p75 /= 1000
        }
      }
    })

    serpArray.forEach((e, k) => {
      if (metrics[k] !== null) {
        e.insertAdjacentHTML('afterend', `
      <div class="serp-vitals-container">
        <div class="serp-vitals">
          <span class="serp-vitals-tag">LCP</span><span class="${getColor('lcp', metrics[k].record.metrics.largest_contentful_paint.percentiles.p75)}">${metrics[k].record.metrics.largest_contentful_paint.percentiles.p75}</span>
          <span class="serp-vitals-tag">CLS</span><span class="${getColor('cls', metrics[k].record.metrics.cumulative_layout_shift.percentiles.p75)}">${metrics[k].record.metrics.cumulative_layout_shift.percentiles.p75}</span>
          <span class="serp-vitals-tag">INP</span><span class="${getColor('inp', metrics[k].record.metrics.interaction_to_next_paint.percentiles.p75)}">${metrics[k].record.metrics.interaction_to_next_paint.percentiles.p75}</span>

        </div>
        <div class="serp-vitals serp-vitals--experimental">
          <span class="serp-vitals-tag">TTFB</span><span class="${getColor('ttfb', metrics[k].record.metrics.time_to_first_byte.percentiles.p75)}">${metrics[k].record.metrics.time_to_first_byte.percentiles.p75}</span>
        </div>
      </div>
  `)
      }
    })
  })
})()
