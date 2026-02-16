A system of system combined of smart home and smart aquarium.




# Smart-Home:
- Blink LEDs when washing machine cycle has finished. 
- Turn on the main room light when motion is detected in that room. 
- When the door bell is pressed, reduce the speaker volume, make the smart assistant alert the homeowner of the doorbell, return the speaker’s volume. 
- When morning alarm triggers, turn heating on to 30 degrees C for 20mins.

# Smart Aquarium
- If the tank’s pH level is out of the required range add either crushed coral (raising the pH) or CO2 (lowering the pH) to the water. 
- When the temperature becomes out of range utilise the heater and cooler to return the temperature to the optimum value. 
- If salinity or nitrate levels become too low, add salt or potassium nitrate respectively. 
- An automated feeder dispenses food at scheduled times. If the food storage in the feeder is running low, the system alerts the owner. 
- The system controls the aquarium’s lighting based on the time of day to simulate natural light conditions. The owner should be able to alter the profile of the lights. 
- If the tank’s filter is clogged or not working efficiently, the system alerts the owner and schedules a cleaning or replacement. 
- If any abnormal behavior or potential health issues are detected within the tank, the owner is alerted. 
- The system keeps track of maintenance tasks such as water changes, filter replacements, and general cleaning. It sends reminders to the owner when these tasks are due. 
- In case of a power outage, the system switches to a backup power supply. It also alerts the owner of the situation. 
- The owner can access real-time data on water conditions, view live camera feeds, and manually dispense food through a smartphone app.




# SoS-level workflows:
- If: pH out of range OR temperature out of range OR salinity/nitrate abnormal OR abnormal fish behavior detected, Then: Reduce speaker volume, Smart assistant announces critical aquarium alert, Turn on main room light (if off), If morning alarm triggers during this condition → override heating automation.
- If: Aquarium is in abnormal condition AND Morning alarm triggers, Then: Do NOT activate 30°C heating boost, Reduce speaker volume, Announce critical aquarium alert, Turn on main room light
- If: Motion detected in aquarium room AND Feeding time is approaching, Then: Turn on main room light, Adjust aquarium lighting profile, Send notification with real-time tank data, Notify owner that manual food dispensing is available
- When power outage occurs: Aquarium switches to backup power, Smart assistant announces outage, Reduce speaker volume to minimum, Disable non-essential heating (cancel 30°C boost if active),Suspend non-critical lighting adjustments.
- When morning alarm triggers: Turn heating to 30°C for 20 mins, Adjust aquarium lighting to simulate sunrise profile, Dispense scheduled food if within feeding time window, Smart assistant announces tank conditions summary.
- If no motion is detected in main room between 11 PM - 6 AM (owner sleeping), aquarium system automatically postpones any non-emergency alerts until morning alarm triggers. During this period, if abnormal aquarium behavior or health issues are detected, only the main room light blinks (silent alert) rather than using the smart assistant. All postponed alerts are announced via smart assistant immediately after morning alarm

