"""Install and actually launch the Release app on an iPhone simulator; collect crash evidence."""
import datetime as dt
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time

major = os.environ.get('TEST_IOS_MAJOR', '27')
output = pathlib.Path('build') / ('launch-ios-' + major)
output.mkdir(parents=True, exist_ok=True)
app = pathlib.Path(sys.argv[1]).resolve()
bundle = 'fr.alaffiche.app'
started = time.time()


def run(*args, check=True, timeout=180):
    result = subprocess.run(args, text=True, capture_output=True, timeout=timeout)
    print('$ ' + ' '.join(args), flush=True)
    if result.stdout:
        print(result.stdout, flush=True)
    if result.stderr:
        print(result.stderr, file=sys.stderr, flush=True)
    if check and result.returncode:
        raise RuntimeError(f'{args[0]} exited {result.returncode}')
    return result


def simctl(*args, **kwargs):
    return run('xcrun', 'simctl', *args, **kwargs)


runtimes = json.loads(simctl('list', 'runtimes', '-j').stdout)['runtimes']
available = [r for r in runtimes if r.get('isAvailable') and r.get('version', '').split('.')[0] == major and '.iOS-' in r['identifier']]
if not available:
    raise RuntimeError(f'Aucun runtime iOS {major} disponible sur ce runner.')
runtime = sorted(available, key=lambda r: tuple(int(n) for n in r['version'].split('.')))[-1]
devices = json.loads(simctl('list', 'devices', 'available', '-j').stdout)['devices'].get(runtime['identifier'], [])
iphones = [d for d in devices if d.get('isAvailable') and d['name'].startswith('iPhone')]
if not iphones:
    raise RuntimeError('Aucun simulateur iPhone préconfiguré compatible avec ce runtime.')
device = next((d for d in iphones if d['name'] == 'iPhone 13 Pro'), iphones[0])
udid = device['udid']
summary = {'runtime': runtime['name'], 'device': device['name'], 'requested_device': 'iPhone 13 Pro', 'udid': udid,
           'timestamp_utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'survived_launch': False}
try:
    if device.get('state') != 'Booted':
        simctl('boot', udid)
    simctl('bootstatus', udid, '-b', timeout=240)
    simctl('ui', udid, 'appearance', 'dark')
    simctl('status_bar', udid, 'override', '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100', check=False)
    simctl('install', udid, str(app))
    launch = simctl('launch', '--terminate-running-process',
                    '--stdout=' + str((output / 'app.stdout.log').resolve()),
                    '--stderr=' + str((output / 'app.stderr.log').resolve()), udid, bundle)
    match = re.search(r':\s*(\d+)\s*$', launch.stdout)
    if not match:
        raise RuntimeError('PID du processus lancé absent.')
    pid = int(match.group(1))
    summary['pid'] = pid
    time.sleep(15)
    # Validate the first automatic France-guide download inside WKWebView, not just process survival.
    deadline = time.time() + 100
    guide_match = None
    while time.time() < deadline:
        logs = '\n'.join(p.read_text(errors='replace') for p in [output / 'app.stdout.log', output / 'app.stderr.log'] if p.exists())
        guide_match = re.search(r'ALAFFICHE_GUIDE_READY channels=(\d+) programmes=(\d+) sports=(\d+)', logs)
        if guide_match:
            break
        time.sleep(1)
    summary['guide_loaded'] = guide_match is not None
    if guide_match:
        summary['guide_channels'], summary['guide_programmes'], summary['guide_sports'] = map(int, guide_match.groups())
    state = run('ps', '-p', str(pid), '-o', 'stat=', '-o', 'command=', check=False)
    summary['process'] = state.stdout.strip()
    summary['survived_launch'] = state.returncode == 0 and not state.stdout.lstrip().startswith('Z') and '/App.app/App' in state.stdout
    capture = simctl('io', udid, 'screenshot', str(output / 'startup.png'), check=False)
    if capture.returncode and 'Cannot choose between' in capture.stderr:
        simctl('io', udid, 'screenshot', '--display=1', str(output / 'startup.png'), check=False)
    if not summary['survived_launch']:
        raise RuntimeError('L’application a quitté dans les 15 secondes suivant son lancement.')
    if not guide_match or summary['guide_channels'] <= 30 or summary['guide_sports'] == 0:
        raise RuntimeError('Le guide France complet et les programmes sportifs ne se sont pas chargés automatiquement.')
finally:
    log = simctl('spawn', udid, 'log', 'show', '--last', '3m', '--style', 'compact',
                 '--predicate', 'process == "App"', check=False, timeout=90)
    (output / 'system.log').write_text(log.stdout + '\n' + log.stderr, encoding='utf-8')
    roots = [pathlib.Path.home() / 'Library/Logs/DiagnosticReports',
             pathlib.Path.home() / f'Library/Developer/CoreSimulator/Devices/{udid}/data/Library/Logs/CrashReporter']
    for root in roots:
        if root.exists():
            for report in list(root.glob('App-*')) + list(root.glob('App_*')):
                if report.is_file() and report.stat().st_mtime >= started:
                    shutil.copyfile(report, output / report.name)
    (output / 'result.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    simctl('shutdown', udid, check=False)
print(json.dumps(summary, ensure_ascii=False), flush=True)
