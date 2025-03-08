C:\Users\danie>netstat -ano | findstr :3000
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       22300
  TCP    127.0.0.1:3000         127.0.0.1:59561        ESTABLISHED     22300
  TCP    127.0.0.1:59561        127.0.0.1:3000         ESTABLISHED     20668

C:\Users\danie>taskkill /PID 22300 /F
SUCCESS: The process with PID 22300 has been terminated.

C:\Users\danie>netstat -ano | findstr :9900
  TCP    [::1]:9900             [::]:0                 LISTENING       19892

C:\Users\danie>taskkill /PID 19892 /F
SUCCESS: The process with PID 19892 has been terminated.

C:\Users\danie>netstat -ano | findstr :3000
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       912
  TCP    127.0.0.1:3000         127.0.0.1:57127        ESTABLISHED     912
  TCP    127.0.0.1:57127        127.0.0.1:3000         ESTABLISHED     20668

C:\Users\danie>taskkill /PID 912 /F
SUCCESS: The process with PID 912 has been terminated.

C:\Users\danie>netstat -ano | findstr :9900
  TCP    [::1]:9900             [::]:0                 LISTENING       23888

C:\Users\danie>taskkill /PID 23888 /F
SUCCESS: The process with PID 23888 has been terminated.