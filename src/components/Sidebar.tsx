import { FlowmakerControls } from './FlowmakerControls';
import { IconButtonRow } from './IconButtonRow';

export function Sidebar() {
  return (
    <div id="sidebar" className="dialkit-root" data-theme="light">
      <h2 className="flm-panel-title">Flowmaker</h2>
      <div className="flm-panel-body">
        <FlowmakerControls />
      </div>
      <IconButtonRow />
    </div>
  );
}
