import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({ labels, data, label }) {
  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: [
              '#1976d2', '#ff9800', '#43a047', '#d32f2f', '#7b1fa2', '#fbc02d', '#0288d1', '#c62828', '#388e3c', '#f57c00'
            ],
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { position: 'right' } },
      }}
    />
  );
}
