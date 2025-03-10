#!/bin/bash
"""
$ python prep_openfast.py --turbsim --index=99 --type=NTM --intensity=C
"""
from __future__ import division

import argparse
import json
import logging
import os
import sys


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

formatter = logging.Formatter(
    '[%(asctime)s][%(levelname)-8s] %(filename)s:%(lineno)d: %(message)s', 
    datefmt='%Y-%m-%d:%H:%M:%S %Z'
)

ch = logging.StreamHandler()
ch.setLevel(logging.DEBUG)
ch.setFormatter(formatter)
logger.addHandler(ch)


_DLC = {
    '12': 'NTM', 
    '13': 'ETM'
}


def _write_infowwind_file(definition_data, idx, ti, wc):
    """
    """
    template = './input/templates/_5mw-inflowwind-template.dat'
    with open(template, 'r') as f: 
        logger.info('Loading InflowWind file {}'.format(template))
        sheet = f.read() 

    f = definition_data['files'][idx]['openfast-keys']['__FileName_BTS__']
    f = f.replace('$TI', ti)
    f = f.replace('$WC', wc)
    fpath = './input/_5mw-inflowwind.dat'
    logger.info('Updating InflowWind parameter FileName_BTS > {}'.format(f))
    sheet = sheet.replace('__FileName_BTS__', '\"{}\"  FileName_BTS'.format(f))
    logger.info('Writting InflowWind *.dat file {}'.format(fpath))
    with open(fpath, 'w') as f: 
        f.write(sheet) 


def _write_elastodyn_file(definition_data, idx):
    """
    """
    template = './input/templates/_5mw-elastodyn-template.dat'
    with open(template, 'r') as f: 
        logger.info('Loading Elastodyn file {}'.format(template))
        sheet = f.read() 

    fpath = './input/_5mw-elastodyn.dat'
    params = ['__BlPitch(1)__', '__BlPitch(2)__', '__BlPitch(3)__', '__RotSpeed__']
    for p in params:
        item = definition_data['files'][idx]['openfast-keys'][p]
        logger.info('Updating InflowWind parameter {} > {}'.format(p, float(item)))
        sheet = sheet.replace(p, '{}  {}'.format(item, p.replace('__', '')))
    
    logger.info('Writting Elastodyn *.dat file {}'.format(fpath))
    with open(fpath, 'w') as f: 
        f.write(sheet) 


def _write_fst_file(definition_data, idx, ti, wc):
    """
    """
    template = './input/templates/_5mw-land-template.fst'
    with open(template, 'r') as f: 
        logger.info('Loading OpenFAST *.fst file {}'.format(template))
        sheet = f.read() 

    fname = definition_data['files'][idx]['file-name']
    fname = fname.replace('$TI', ti)
    fname = fname.replace('$WC', wc)
    fpath = './input/{}'.format(fname)
    logger.info('Writting OpenFAST *.fst file {}'.format(fpath))
    with open(fpath, 'w') as f: 
        f.write(sheet) 

    logger.info('Successfully wrote OpenFAST *.fst file {}'.format(fpath))
    return fname


def create_input_file(ex_sheet, idx, ti, wc=''):
    """
    """
    with open(ex_sheet, 'r') as f:
        logger.info('Loading definition sheet {}'.format(ex_sheet))
        definition_data = json.load(f)

    _write_infowwind_file(definition_data, idx, ti, wc)
    _write_elastodyn_file(definition_data, idx)
    fst_fname = _write_fst_file(definition_data, idx, ti, wc)
    return fst_fname


def create_simulation_definition(lc):
    """
    """
    data = {}
    data['files'] = []
    fname = 'pitch-schedule.json'
    with open(fname, 'r') as f:
        logger.info('Loading pitch schedule sheet {}'.format(fname))
        pitch_sched = json.load(f)

    logger.info('Pitch schedule: {}'.format(json.dumps(pitch_sched, indent=4)))
    for i,sched in enumerate(pitch_sched['schedule']):
        for j in range(12):
            ws = sched['ws']
            pitch = sched['pitch']
            rpm = sched['rpm']
            name = 'DLC{}-$WC{}-{}ms-$TI-seed{}.fst'.format(lc, _DLC[lc], ws, j+1)
            data['files'].append({
                'index': 12 * i + j,
                'file-name': name,
                'wind-speed': ws,
                'design-load-case': lc,
                'turbulence-type': _DLC[lc],
                'openfast-keys': {
                    '__BlPitch(1)__': pitch,
                    '__BlPitch(2)__': pitch,
                    '__BlPitch(3)__': pitch,
                    '__RotSpeed__': rpm,
                    '__FileName_BTS__': '$WC{}-{}ms-$TI-seed{}.bts'.format(
                        _DLC[lc], ws, j+1
                    )
                }
            })

    ex_sheet_name = 'DLC{}-{}-simulation-definition.json'.format(lc, _DLC[lc])
    json_string = json.dumps(data, indent=4)
    logger.info('Writting *.json file {}'.format(ex_sheet_name))
    with open(ex_sheet_name, 'w') as f: 
        f.write(json_string) 

    logger.info('Successfully wrote *.json file {}'.format(fname))


def get_turbsim_file_name(fpath):
    """
    """
    logger.info('Opening file {}'.format(fpath))
    with open(fpath, 'r') as f:     
        for _, line in enumerate(f):
            if "FileName_BTS" in line:
                return line.replace('"', '').split()[0]
    logger.error('InflowWind file does not contain keyword FileName_BTS'.format(fpath))


def get_wind_speed(fpath):
    """
    """
    fname = get_turbsim_file_name(fpath)
    return fname.split('-')[1].replace('ms', '')


def get_dlc(fpath):
    fname = os.path.basename(fpath)
    return fname.split('-')[2].replace('DLC', '')


def get_turbulence_type(fpath):
    fname = os.path.basename(fpath)
    return fname.split('-')[3].split('.')[0]


if __name__=='__main__':
    """
    """
    parser = argparse.ArgumentParser(
        description='Process input file for OpenFAST. Example: \
            $ python prep_openfast.py --create-simulation-definition --dlc 13 \
            $ python prep_openfast.py --create-simulation-definition --dlc 12 \
            $ python prep_openfast.py --create-fst --file ./simulation-definition/DLC12-NTM-simulation-definition.json --index 30 --ti B \
            $ python prep_openfast.py --create-fst --file ./simulation-definition/DLC13-ETM-simulation-definition.json --index 200 --ti B --wc 2 \
            $ python prep_openfast.py --get-turbsim-path --file ./input/_5mw-inflowwind.dat \
            $ python prep_openfast.py --get-wind-speed --file ./input/_5mw-inflowwind.dat \
            $ python prep_openfast.py --get-dlc --file ./simulation-definition/DLC12-NTM-simulation-definition.json \
            $ python prep_openfast.py --get-turbulence-type --file ./simulation-definition/DLC12-NTM-simulation-definition.json'
    )
    parser.add_argument(
        '--create-simulation-definition',
        dest='create_simulation_definition', 
        action='store_true',
        help='Create JSON definition sheet'
    )
    parser.add_argument(
        '--create-fst',
        dest='create_fst', 
        action='store_true',
        help='Create OpenFAST *.fst input files for defined load case.'
    )
    parser.add_argument(
        '--file',
        dest='file', 
        type=str,
        help='Input file.'
    )
    parser.add_argument(
        '--index',
        dest='idx', 
        type=int,
        help='Batch index for the exhange sheet. Value is between 0 and 264'
    )
    parser.add_argument(
        '--dlc',
        dest='dlc', 
        type=str,
        help='Design load case. Options are 12 and 13. \
            IEC turbulence type: \
            "12 = NTM"=normal, \
            "13 = ETM"=extreme turbulence'
    )
    parser.add_argument(
        '--wc',
        dest='wc', 
        type=str,
        default='',
        help='Wind class. \
            IEC wind class type, required for ETM turbulence model. \
            can be type 1, 2 or 3' 
    ) 
    parser.add_argument(
        '--ti',
        dest='ti', 
        type=str,
        help='IEC turbulence intensity ( \
            "A", "B", "C" or the turbulence intensity in percent) \
            ("KHTEST" option with NWTCUP model, not used for other models)'
    )
    parser.add_argument(
        '--get-turbsim-path',
        dest='get_turbsim_path', 
        action='store_true',
        help='Retrieve the turbsim file path from InflowWind file'
    )
    parser.add_argument(
        '--get-wind-speed',
        dest='get_wind_speed', 
        action='store_true',
        help='Retrieve wind speed from InflowWind file'
    )
    parser.add_argument(
        '--get-dlc',
        dest='get_dlc', 
        action='store_true',
        help='Get DLC from definition sheet'
    )
    parser.add_argument(
        '--get-turbulence-type',
        dest='get_turbulence_type', 
        action='store_true',
        help='Get turbulence model type definition sheet'
    )

    logger.info('Executing prep_openfast.py for OpenFAST')
    try: 
        args = parser.parse_args()
        logger.info('Arguments: \n' + \
            f'   create-simulation-definition: {args.create_simulation_definition} \n' + \
            f'   create-fst: {args.create_fst} \n' + \
            f'   get-turbsim-path: {args.get_turbsim_path} \n' + \
            f'   get-wind-speed: {args.get_wind_speed} \n' + \
            f'   get-turbulence-type: {args.get_turbulence_type} \n' + \
            f'   get-dlc: {args.get_dlc}\n'
            f'   file: { args.file}\n' + \
            f'   index: {args.idx}\n' + \
            f'   dlc: {args.dlc} \n' + \
            f'   ti: {args.ti} \n' + \
            f'   wc: {args.wc}'
        )

        if args.create_simulation_definition:
            logger.info('Creating OpenFAST definition sheet')
            create_simulation_definition(args.dlc)
        elif args.create_fst:
            logger.info('Creating OpenFAST input file')
            fpath = create_input_file(args.file, args.idx, args.ti, args.wc)
            logger.info('OpenFAST file: <{}>'.format(fpath))
            sys.stdout.write(fpath)
        elif args.get_turbsim_path:
            logger.info('Retrieving the turbsim file name from {}'.format(args.file))
            fpath = get_turbsim_file_name(args.file)
            logger.info('Turbsim file: <{}>'.format(fpath))
            sys.stdout.write(fpath)
        elif args.get_wind_speed:
            logger.info('Retrieving wind speed from the turbsim file {}'.format(args.file))
            ws = get_wind_speed(args.file)
            logger.info('Wind speed: <{}>'.format(ws))
            sys.stdout.write(ws)
        elif args.get_dlc:
            logger.info('Retrieving dlc from definition sheet {}'.format(args.file))
            dlc = get_dlc(args.file)
            logger.info('DLC: <{}>'.format(dlc))
            sys.stdout.write(dlc)
        elif args.get_turbulence_type:
            logger.info('Retrieving turbulence types from definition sheet {}'.format(args.file))
            model = get_turbulence_type(args.file)
            logger.info('Turbulence type: <{}>'.format(model))
            sys.stdout.write(model)
        else:
            logger.error('You need to define an input commands')
    except:
        logger.exception('Got exception on main handler')
        raise