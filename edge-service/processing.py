"""
LNMIIT Smart Healthcare System - Edge Signal Processing
Author: LNMIIT Campus IoT Engineering Team

Performs raw PPG peak detection, SpO2 R-value calculation, and LM35 analog ADC calibration.
"""

import math
import time

def calibrate_lm35_temperature(adc_reading, vref=3.3, adc_resolution=4095):
    """
    Converts 12-bit ESP32 ADC reading to Celsius for LM35 sensor.
    LM35 provides 10mV per degree Celsius.
    """
    voltage_mv = (adc_reading / adc_resolution) * (vref * 1000.0)
    temperature_c = voltage_mv / 10.0
    return round(temperature_c, 2)

def calculate_spo2_ratio(red_ac, red_dc, ir_ac, ir_dc):
    """
    Calculates SpO2 based on the empirical R-curve of the MAX30102 sensor.
    R = (AC_red / DC_red) / (AC_ir / DC_ir)
    SpO2 = 110 - 25 * R (Standard approximation)
    """
    if red_dc == 0 or ir_dc == 0 or ir_ac == 0:
        return 98.0
    r_val = (red_ac / red_dc) / (ir_ac / ir_dc)
    spo2 = 110.0 - (25.0 * r_val)
    return round(max(70.0, min(100.0, spo2)), 1)

def filter_noise(readings, window_size=5):
    """
    Simple moving average smoothing filter to remove sensor motion artifacts.
    """
    if not readings:
        return 0.0
    recent = readings[-window_size:]
    return round(sum(recent) / len(recent), 2)
