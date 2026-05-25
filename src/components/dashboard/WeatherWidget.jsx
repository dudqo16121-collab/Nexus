export default function WeatherWidget() {
  return (
    <div className="weather-widget">
      <div>
        <div className="weather-info">
          <h4>21°C</h4>
          <p>맑음 · 미세먼지 좋음</p>
        </div>
        <div style={{
          marginTop: 10,
          fontSize: '0.8rem',
          background: 'rgba(0,0,0,0.2)',
          padding: '5px 10px',
          borderRadius: 10,
          display: 'inline-block',
        }}>
          <i className="fa-solid fa-location-dot"></i> Gwangju, KR
        </div>
      </div>
      <i className="fa-solid fa-sun weather-bg-icon"></i>
    </div>
  );
}