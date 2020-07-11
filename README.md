# homebridge-nature-remo-fan
Homebridge Plug-in for Fan Managed by Nature Remo

## Features
* Switch on / off.
* Adjust rotation speed.

## configuration
**Example**
```json
{
    "accessory": "NatureRemoFan",
    "name": "Air Circulator",
    "access_token": "<ACCESS_TOKEN>",
    "appliance_id": "<APPLIANCE_ID>" 
}
```
You can find out more about the `ACCESS_TOKEN`/`APPLIANCE_ID` [here](https://home.nature.global/)