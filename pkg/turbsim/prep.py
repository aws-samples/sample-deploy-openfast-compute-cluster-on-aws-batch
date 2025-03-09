#!/bin/bash
"""
$ python prep.py --turbsim --index=99 --type=NTM --intensity=C
"""
from __future__ import division

import argparse
import json
import logging
import sys

# import boto3
# import watchtower


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

# fh = logging.FileHandler('logging.log', 'w')
# fh.setFormatter(formatter)
# fh.setLevel(logging.DEBUG)
# logger.addHandler(fh)

# cwh = watchtower.CloudWatchLogHandler(
#     log_group='/openfast/turbsim/prep',
#     boto3_client=boto3.client('logs', region_name='us-west-2')
# )
# cwh.setFormatter(formatter)
# cwh.setLevel(logging.DEBUG)
# logger.addHandler(cwh)


def linspace(start, stop, n):
    """
    """
    if n == 1:
        yield stop
        return
    h = (stop - start) / (n - 1)
    for i in range(n):
        yield start + h * i


def create_input_file(idx, wind_type, ti):
    """
    """
    fname = './input/exchange-sheet.json'
    with open(fname, 'r') as f:
        logger.info('Loading exchange sheet {}'.format(fname))
        exchange_data = json.load(f)

    fname = './input/turbsim-template.inp'
    with open(fname, 'r') as f: 
        logger.info('Loading TurbSim template file {}'.format(fname))
        base = f.read() 
  
    for k,v in exchange_data['files'][idx].items():
        logger.info('Updating TurbSim input parameter {} --> {}'.format(k,v))
        base = base.replace(k, '{}   {}'.format(v,k))

    base = base.replace(
        'IEC_TURB   IECturbc', 
        '{}       IECturbc'.format(ti)
    )
    base = base.replace(
        'IEC_WIND_TYPE   IEC_WindType', 
        '{}     IEC_WindType'.format(wind_type)
    )

    logger.info('Updating TurbSim input parameter IEC_WIND_TYPE --> {}'.format(wind_type))
    logger.info('Updating TurbSim input parameter IEC_TURB --> {}'.format(ti))

    fname = exchange_data['files'][idx]['fname']
    fname = fname.replace('IEC_TURB', ti)
    fname = fname.replace('IEC_WIND_TYPE', wind_type)

    logger.info('Writting TurbSim *.inp file {}'.format(fname))
    with open(fname, 'w') as f: 
        f.write(base) 
    logger.info('Successfully wrote TurbSim *.inp file {}'.format(fname))
    return fname


def create_exchange_sheet():
    """
    """
    ws = list(linspace(4, 25, 22))
    seeds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]
    d = {}
    d['files'] = []

    logger.info('Wind speeds: {}'.format(ws))
    logger.info('Seeds: {}'.format(seeds))

    for i,w in enumerate(ws):
        for j,seed in enumerate(seeds):
            d['files'].append({
                'fname': 'IEC_WIND_TYPE-{}ms-IEC_TURB-seed{}.inp'.format(int(w), j+1),
                'IECturbc': 'IEC_TURB',
                'IEC_WindType': 'IEC_WIND_TYPE',
                'RandSeed1': seed,
                'URef': w
            })

    fname = 'exchange-sheet.json'
    json_string = json.dumps(d, indent=4)
    logger.info('Writting *.json file {}'.format(fname))
    with open(fname, 'w') as f: 
        f.write(json_string) 
    logger.info('Successfully wrote *.json file {}'.format(fname))


if __name__=='__main__':
    """
    """
    parser = argparse.ArgumentParser(
        description='Process input file for TurbSim. Example: \
            $ python prep.py --exchange-sheet \
            $ python prep.py --turbsim --index=99 --type=NTM --intensity=B'
    )
    parser.add_argument(
        '--exchange-sheet',
        dest='exchange_sheet', 
        action='store_true',
        help='Create json exchange sheet'
    )
    parser.add_argument(
        '--turbsim',
        dest='turbsim_file', 
        action='store_true',
        help='Create turbsim input file'
    )
    parser.add_argument(
        '--index',
        dest='idx', 
        type=int,
        help='Batch index for the exhange sheet. Value is between 0 and 264'
    )
    parser.add_argument(
        '--type',
        dest='wind_type', 
        type=str,
        help='IEC turbulence type ( \
            "NTM"=normal, \
            "xETM"=extreme turbulence, \
            "xEWM1"=extreme 1-year wind, \
            "xEWM50"=extreme 50-year wind, \
            where x=wind turbine class 1, 2, or 3)'
    )
    parser.add_argument(
        '--intensity',
        dest='ti', 
        type=str,
        help='IEC turbulence intensity ( \
            "A", "B", "C" or the turbulence intensity in percent) \
            ("KHTEST" option with NWTCUP model, not used for other models)'
    )

    logger.info('Executing prep.py for TurbSim')
    try: 
        args = parser.parse_args()
        logger.info('Arguments: \n' + \
            f'   exchange-sheet: {args.exchange_sheet} \n' + \
            f'   turbsim: {args.turbsim_file} \n' + \
            f'   index: {args.idx} \n' + \
            f'   type: {args.wind_type} \n' + \
            f'   intesity: { args.ti}'
        )

        if args.exchange_sheet:
            logger.info('Creating TurbSim exchange sheet')
            create_exchange_sheet()
        elif args.turbsim_file:
            logger.info('Creating TurbSim input file')
            fname = create_input_file(args.idx, args.wind_type, args.ti)
            sys.stdout.write(fname)
        else:
            logger.error('You need to define an input commands')
    except:
        logger.exception('Got exception on main handler')
        raise
    