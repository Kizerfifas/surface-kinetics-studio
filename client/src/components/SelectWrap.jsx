/** Wraps <select className="ui-select"> — arrow drawn on wrapper, not on select. */
export default function SelectWrap({ children, className = '', style }) {
  return (
    <div className={`select-wrap${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  );
}
