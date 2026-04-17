function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  config.options = config.options || {};
  config.options.plugins = config.options.plugins || {};
  config.options.plugins.legend = config.options.plugins.legend || {};
  config.options.plugins.legend.labels = config.options.plugins.legend.labels || {};
  config.options.plugins.legend.labels.color = '#8b949e';
  config.options.scales = config.options.scales || {};

  for (const axis of Object.values(config.options.scales)) {
    axis.ticks = axis.ticks || {};
    axis.ticks.color = axis.ticks.color || '#8b949e';
    axis.grid = axis.grid || {};
    axis.grid.color = axis.grid.color || '#21262d';
  }

  return new Chart(canvas, config);
}

export { createChart };
