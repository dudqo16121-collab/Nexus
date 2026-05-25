import { useState } from 'react';

export default function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: '주간 업무 보고서 작성', deadline: '오늘 18:00', done: false },
    { id: 2, text: '클라이언트 미팅 자료 준비', deadline: '완료됨',     done: true  },
  ]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos([
      ...todos,
      { id: Date.now(), text, deadline: '오늘', done: false },
    ]);
    setInput('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map((t) =>
      t.id === id
        ? { ...t, done: !t.done, deadline: !t.done ? '완료됨' : '오늘' }
        : t
    ));
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>
          나의 할 일 (To-do)
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 'normal',
            color: 'var(--text-muted)',
            marginLeft: 10,
          }}>
            드래그하여 순서 변경 (개발 예정)
          </span>
        </h2>
      </div>
      <div className="todo-input-group">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="새로운 할 일을 입력 후 엔터를 누르세요"
        />
        <button
          className="btn btn-in"
          onClick={addTodo}
          style={{ flex: 'none', width: 80, borderRadius: 10 }}
        >
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>
      <div>
        {todos.map((todo) => (
          <div key={todo.id} className="task-item">
            <div
              className={`task-checkbox ${todo.done ? 'checked' : ''}`}
              onClick={() => toggleTodo(todo.id)}
            ></div>
            <div className="task-info">
              <p className={todo.done ? 'completed' : ''}>{todo.text}</p>
              <span>{todo.deadline}</span>
            </div>
            <i className="fa-solid fa-grip-vertical" style={{ color: 'var(--border-color)' }}></i>
          </div>
        ))}
      </div>
    </section>
  );
}