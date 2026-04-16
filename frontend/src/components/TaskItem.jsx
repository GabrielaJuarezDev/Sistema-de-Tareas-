import React from 'react';

export default function TaskItem({ task, onToggleCompleted, onDelete, disabled }) {
  return (
    <tr>
      <td>
        <div className="fw-semibold">{task.title}</div>
        {task.description ? (
          <div className="text-secondary small mt-1">
            {task.description}
          </div>
        ) : null}
        {task.due_at ? (
          <div className="small mt-2">
            <span className="badge text-bg-info">Vence</span>{' '}
            <span className="text-body-secondary">{task.due_at}</span>
          </div>
        ) : null}
      </td>
      <td>
        <span className={`badge ${task.completed ? 'text-bg-success' : 'text-bg-secondary'}`}>
          {task.completed ? 'Completada' : 'Pendiente'}
        </span>
      </td>
      <td className="text-secondary small">
        {task.created_at}
      </td>
      <td className="text-secondary small">
        {task.due_at || '—'}
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm" role="group" aria-label="Acciones de tarea">
          <button
            type="button"
            className={`btn ${task.completed ? 'btn-outline-secondary' : 'btn-outline-success'}`}
            onClick={onToggleCompleted}
            disabled={disabled}
          >
            {task.completed ? 'Reabrir' : 'Completar'}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={onDelete}
            disabled={disabled}
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

