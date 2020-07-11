import got from 'got';

import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";

let hap: HAP;

interface NatureRemoSignal {
  id: String
  name: String
  image: String
}

const baseUrl = 'https://api.nature.global/1/'

export = (api: API) => {
  hap = api.hap;
  api.registerAccessory('NatureRemoFan', NatureRemoFan);
};

class NatureRemoFan implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly config: { access_token: any; appliance_id: any; };
  private switchOn = false;
  private rotationSpeed = 0;
  private signals: {
    off: any;
    on: any;
    low: any;
    medium: any;
    high: any;
  }

  private readonly fanService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.config = {
      access_token: config.access_token,
      appliance_id: config.appliance_id || null
    }
    this.signals = {
      off: null,
      on: null,
      low: null,
      medium: null,
      high: null
    }

    // create a new Fan service
    this.fanService = new hap.Service.Fan(this.name);

    // create handlers for required characteristics
    this.fanService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.handleOnGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleOnSet.bind(this));

    this.fanService.getCharacteristic(hap.Characteristic.RotationSpeed)
      .on(CharacteristicEventTypes.GET, this.handleRotationSpeedGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.handleRotationSpeedSet.bind(this));

    this.setup();

    log.info(`${this.name} finished initializing!`);
  }

  setup() {
    this._fetchSignals();
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  handleOnGet(callback: CharacteristicGetCallback) {
    this.log.debug("Current state of the switch was returned: " + (this.switchOn ? "ON" : "OFF"));
    callback(undefined, this.switchOn);
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleOnSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.switchOn = value as boolean;
    this.log.debug("Switch state was set to: " + (this.switchOn ? "ON" : "OFF"));
    this._sendSignal(this.switchOn ? this.signals.on : this.signals.off);
    callback();
  }

  /**
   * Handle requests to get the current value of the "RotationSpeed" characteristic
   */
  handleRotationSpeedGet(callback: CharacteristicGetCallback) {
    this.log.debug("Current state of the rotation speed: " + this.rotationSpeed);
    callback(undefined, this.rotationSpeed)
  }

  /**
   * Handle requests to set the "RotationSpeed" characteristic
   */
  handleRotationSpeedSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.rotationSpeed = value as number;
    this.log.debug("Set rotation speed: " + this.rotationSpeed);

    let s: string;

    if (this.rotationSpeed == 0) {
      callback();
      return;
    } else if (this.rotationSpeed <= 33) {
      s = this.signals.low;
    } else if (this.rotationSpeed <= 66) {
      s = this.signals.medium;
    } else {
      s = this.signals.high;
    }

    this._sendSignal(s);
    callback()
  }

  identify(): void {
    this.log("Identify!");
  }

  getServices(): Service[] {
    return [
      this.fanService
    ];
  }

  _fetchSignals() {
    (async () => {
      try {
        const res = await got(`appliances/${this.config.appliance_id}/signals`, {
          prefixUrl: baseUrl,
          headers: { 'Authorization': `Bearer ${this.config.access_token}` },
          responseType: 'json',
        });

        let js = JSON.parse(JSON.stringify(res.body));
        if (js == null) {
          this.log.error(`failed to parse response: ${res.body}`);
          return;
        }

        const offSignal = js.find((v: NatureRemoSignal) => v.image === 'ico_off');
        this.signals.off = offSignal.id;
        const onSignal = js.find((v: NatureRemoSignal) => v.image === 'ico_on');
        this.signals.on = onSignal.id;
	const lowSignal = js.find((v: NatureRemoSignal) => v.image === 'ico_number_1');
	this.signals.low = lowSignal.id;
	const mediumSignal = js.find((v: NatureRemoSignal) => v.image === 'ico_number_2');
	this.signals.medium = mediumSignal.id;
	const highSignal = js.find((v: NatureRemoSignal) => v.image === 'ico_number_3');
	this.signals.high = highSignal.id;

        this.log.debug(`off signal id :${this.signals.off}`)
        this.log.debug(`on signal id :${this.signals.on}`)
        this.log.debug(`low signal id :${this.signals.low}`)
        this.log.debug(`medium signal id :${this.signals.medium}`)
        this.log.debug(`high signal id :${this.signals.high}`)
      } catch (error) {
        this.log.error(error.response.body);
        return;
      }
    })();
  }

  _sendSignal(signal_id: String) {
    this.log.debug("Signal id: " + signal_id);

    (async () => {
      const { body } = await got.post(`signals/${signal_id}/send`, {
        prefixUrl: baseUrl,
        headers: { 'Authorization': `Bearer ${this.config.access_token}` },
      });
    })();
  }

}
