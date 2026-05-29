import React from 'react';
import { Award, Zap, AlertCircle, RefreshCw, Printer, BookOpen, Clock } from 'lucide-react';
import type { PersonalityReport, AnswerRecord } from '../types';

interface ReportCardProps {
  report: PersonalityReport;
  answers: AnswerRecord[];
  onReset: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  answers,
  onReset
}) => {
  
  // Custom Radar Chart calculation
  const cx = 150;
  const cy = 110;
  const maxRadius = 75;
  const axes = [
    { name: 'Technical', val: report.technicalAccuracy },
    { name: 'Confidence', val: report.confidence },
    { name: 'Communication', val: report.communication },
    { name: 'Stress Control', val: report.stressManagement },
    { name: 'Problem Solving', val: report.problemSolving }
  ];

  const getCoordinates = (index: number, val: number) => {
    const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2; // Start from top
    const radius = (val / 100) * maxRadius;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { x, y };
  };

  // Generate pentagon grid paths
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPaths = gridLevels.map(level => {
    const points = Array.from({ length: 5 }).map((_, idx) => {
      const { x, y } = getCoordinates(idx, level);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')} Z`;
  });

  // Generate candidate score polygon path
  const scorePoints = axes.map((axis, idx) => {
    const { x, y } = getCoordinates(idx, axis.val);
    return `${x},${y}`;
  });
  const scorePath = `M ${scorePoints.join(' L ')} Z`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto', padding: '20px 0' }}>
      
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(to right, #00f0ff, #ab47bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            INTERVIEW COMPLETED
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Evaluation matrix & psychological personality index computed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => window.print()} className="btn-cyber purple" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <Printer size={14} /> Print Report
          </button>
          <button onClick={onReset} className="btn-cyber" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> New Session
          </button>
        </div>
      </div>

      {/* Hero Stats Card */}
      <div className="grid-cols-2" style={{ gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
        {/* Profile Details */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--cyber-cyan), var(--cyber-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
            }}>
              <Award size={26} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>COGNITIVE PROFILE</div>
              <h2 className="text-cyan-glow" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {report.personalityType}
              </h2>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {report.personalityDescription}
          </p>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }} />
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DURATION</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Clock size={14} className="text-cyan-glow" /> {report.durationMinutes} minutes
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QUESTIONS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <BookOpen size={14} className="text-cyan-glow" /> {report.totalQuestions} Rounds
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OVERALL RATING</div>
              <div className="text-purple-glow" style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
                {report.overallScore} / 100
              </div>
            </div>
          </div>
        </div>

        {/* Circular Overall Score indicator */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', width: '130px', height: '130px' }}>
            <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="6" />
              <circle 
                cx="50" 
                cy="50" 
                r="40" 
                fill="none" 
                stroke="var(--cyber-cyan)" 
                strokeWidth="6" 
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * report.overallScore) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ filter: 'drop-shadow(0 0 4px var(--cyber-cyan-glow))' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>{report.overallScore}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>MATCH SCORE</span>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Calculated from technical competency combined with stress resistance and communication stability.
          </span>
        </div>
      </div>

      {/* Radar Matrix & Strengths */}
      <div className="grid-cols-2" style={{ gridTemplateColumns: '4.5fr 5.5fr', gap: '20px' }}>
        {/* Custom SVG Radar Chart */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, alignSelf: 'flex-start', color: 'var(--text-secondary)' }}>
            EVALUATION AXIS RADAR
          </span>
          
          <svg style={{ width: '300px', height: '230px', marginTop: '10px' }}>
            <defs>
              <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyber-cyan)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--cyber-purple)" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Polygon grids */}
            {gridPaths.map((path, idx) => (
              <path key={idx} d={path} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            ))}

            {/* Axis lines */}
            {axes.map((_, idx) => {
              const { x, y } = getCoordinates(idx, 100);
              return (
                <line key={idx} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.8" />
              );
            })}

            {/* Candidate Score Poly */}
            <path d={scorePath} fill="url(#radarGrad)" stroke="var(--cyber-cyan)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 3px var(--cyber-cyan-glow))' }} />

            {/* Score dots */}
            {axes.map((axis, idx) => {
              const { x, y } = getCoordinates(idx, axis.val);
              return (
                <circle key={idx} cx={x} cy={y} r="3" fill="#ffffff" stroke="var(--cyber-cyan)" strokeWidth="1.5" />
              );
            })}

            {/* Labels */}
            {axes.map((axis, idx) => {
              const angle = (idx * 2 * Math.PI) / 5 - Math.PI / 2;
              // Push text slightly outward
              const textR = maxRadius + 18;
              const textX = cx + textR * Math.cos(angle);
              const textY = cy + textR * Math.sin(angle);
              
              // Align text based on quadrant
              let textAnchor: 'middle' | 'start' | 'end' = 'middle';
              if (Math.cos(angle) > 0.1) textAnchor = 'start';
              else if (Math.cos(angle) < -0.1) textAnchor = 'end';

              return (
                <g key={idx}>
                  <text 
                    x={textX} 
                    y={textY} 
                    fill="var(--text-secondary)" 
                    fontSize="9.5" 
                    fontFamily="monospace"
                    textAnchor={textAnchor}
                    alignmentBaseline="middle"
                  >
                    {axis.name}
                  </text>
                  <text 
                    x={textX} 
                    y={textY + 11} 
                    fill="var(--cyber-cyan)" 
                    fontSize="9" 
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor={textAnchor}
                    alignmentBaseline="middle"
                  >
                    {axis.val}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Strengths & Growth Areas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Strengths */}
          <div className="glass-panel" style={{ padding: '20px', flex: 1, borderLeft: '4px solid var(--confidence-color)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--confidence-color)', marginBottom: '12px' }}>
              <Zap size={16} fill="var(--confidence-color)" /> KEY STRENGTHS
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px', listStyle: 'none' }}>
              {report.strengths.map((str, idx) => (
                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--confidence-color)' }}>✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Growth Areas */}
          <div className="glass-panel" style={{ padding: '20px', flex: 1, borderLeft: '4px solid var(--hesitation-color)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--hesitation-color)', marginBottom: '12px' }}>
              <AlertCircle size={16} fill="var(--hesitation-color)" /> DEVIATIONS & GROWTH AREAS
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px', listStyle: 'none' }}>
              {report.growthAreas.map((area, idx) => (
                <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--hesitation-color)' }}>⚠</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Question Timeline Detail */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          ROUND-BY-ROUND BIOMETRIC TRANSCRIPT
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {answers.map((answer, index) => (
            <div key={index} style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--cyber-cyan)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                    ROUND {index + 1}: {answer.type === 'coding' ? 'REALTIME CODING' : 'VERBAL EXPLANATION'}
                  </span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '6px' }}>
                    {answer.questionText}
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>ROUND SCORE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cyber-cyan)' }}>
                      {answer.aiScore || 70}/100
                    </div>
                  </div>
                </div>
              </div>

              {/* Question Transcript */}
              <div style={{ display: 'grid', gridTemplateColumns: answer.userCodeAnswer ? '1fr 1fr' : '1fr', gap: '16px', margin: '12px 0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>CANDIDATE EXPLANATION:</span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', minHeight: '50px', border: '1px solid rgba(255,255,255,0.02)', fontStyle: 'italic', lineHeight: '1.5' }}>
                    "{answer.userTextAnswer || 'No verbal answer recorded.'}"
                  </div>
                </div>
                
                {answer.userCodeAnswer && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>CODE SOLUTION SUBMITTED:</span>
                    <pre style={{
                      margin: 0,
                      padding: '10px',
                      background: '#04070f',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      overflowX: 'auto',
                      border: '1px solid rgba(255,255,255,0.03)',
                      color: '#a9b2c3',
                      maxHeight: '120px'
                    }}>
                      <code>{answer.userCodeAnswer}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Answer Feedback & Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '4fr 2fr', gap: '16px', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '6px', borderTop: '1px dashed rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>INTERVIEWER FEEDBACK:</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                    {answer.aiFeedback}
                  </p>
                </div>

                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg Stress:</span>
                    <span style={{ fontWeight: 600, color: answer.avgStress > 50 ? 'var(--stress-color)' : 'var(--text-primary)' }}>{Math.round(answer.avgStress)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg Confidence:</span>
                    <span style={{ fontWeight: 600, color: 'var(--confidence-color)' }}>{Math.round(answer.avgConfidence)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hesitations:</span>
                    <span style={{ fontWeight: 600, color: answer.hesitationCount > 2 ? 'var(--hesitation-color)' : 'var(--text-primary)' }}>{answer.hesitationCount} times</span>
                  </div>
                  {answer.type === 'coding' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Backspaces:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{answer.backspaceCount} keypresses</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
