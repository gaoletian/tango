import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, css } from 'coral-system';
import { Dropdown, Button } from 'antd';
import { isValidExpressionCode } from '@music163/tango-core';
import { getValue, IVariableTreeNode, noop } from '@music163/tango-helpers';
import { CloseCircleFilled, ExpandAltOutlined, MenuOutlined } from '@ant-design/icons';
import { Panel, InputCode, Action, DragPanel } from '@music163/tango-ui';
import { FormItemComponentProps } from '@music163/tango-setting-form';
import { useWorkspace, useWorkspaceData } from '@music163/tango-context';
import { VariableTree } from '../components';
import { useSandboxQuery } from '../context';
import { CODE_TEMPLATES } from '../helpers';
import { shapeServiceValues } from '../sidebar/datasource-panel/interface-config';

export const expressionValueValidate = (value: string) => {
  if (!isValidExpressionCode(value)) {
    return '表达式存在语法错误！';
  }
};

export const jsonValueValidate = (value: string) => {
  try {
    JSON.parse(value);
  } catch (e) {
    return '不是合法的 JSON 语法！';
  }
};

const suffixStyle = css`
  display: flex;
  align-items: center;
  .anticon-close-circle {
    color: rgba(0, 0, 0, 0.25);
    &:hover {
      color: rgba(0, 0, 0, 0.45);
    }
  }
`;

export interface ExpressionSetterProps extends FormItemComponentProps<string> {
  modalTitle?: string;
  modalTip?: string;
  autoCompleteOptions?: string[];
  allowClear?: boolean;
  showOptionsDropDown?: boolean;
}

export function ExpressionSetter(props: ExpressionSetterProps) {
  const {
    onChange,
    modalTitle,
    modalTip,
    autoCompleteOptions,
    placeholder = '在这里输入JS代码',
    value: valueProp,
    status,
    allowClear = true,
    newStoreTemplate,
    showOptionsDropDown = true,
  } = props;
  // const codeValue = getCodeOfWrappedCode(valueProp);
  const [inputValue, setInputValue] = useState(valueProp);

  // when receive new value, sync state
  useEffect(() => {
    setInputValue(valueProp);
  }, [valueProp]);

  const change = useCallback(
    (code: string) => {
      if (code === valueProp) {
        return;
      }
      onChange(code);
    },
    [valueProp, onChange],
  );

  const sandbox = useSandboxQuery();
  const evaluateContext = sandbox.window;

  return (
    <Box className="ExpressionSetter">
      {/* 同时支持下拉框展示 */}
      <InputCode
        placeholder={placeholder}
        suffix={
          <Box css={suffixStyle}>
            {allowClear && (
              <CloseCircleFilled
                title="清空"
                onClick={() => {
                  change('');
                }}
              />
            )}
            {showOptionsDropDown && autoCompleteOptions?.length && (
              <Dropdown
                menu={{
                  items: autoCompleteOptions.map((option) => ({
                    key: option,
                    label: (
                      <Text
                        onClick={() => {
                          change(option);
                        }}
                      >
                        {option}
                      </Text>
                    ),
                  })),
                }}
              >
                <Action tooltip="使用预设代码片段" icon={<MenuOutlined />} size="small" />
              </Dropdown>
            )}
            <ExpressionPopover
              title={modalTitle}
              subTitle={modalTip}
              placeholder={placeholder}
              autoCompleteOptions={autoCompleteOptions}
              newStoreTemplate={newStoreTemplate}
              value={inputValue}
              onOk={(value) => {
                change(value);
              }}
            />
          </Box>
        }
        value={inputValue}
        onChange={setInputValue}
        onBlur={() => {
          change(inputValue);
        }}
        autoCompleteContext={evaluateContext}
        autoCompleteOptions={autoCompleteOptions}
        status={status}
        maxHeight="200px"
      />
    </Box>
  );
}

export interface ExpressionPopoverProps {
  title?: string;
  subTitle?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onOk?: (value: string) => void;
  dataSource?: IVariableTreeNode[];
  autoCompleteOptions?: string[];
  /**
   * 新建 store 的模板代码
   */
  newStoreTemplate?: string;
  children?: React.ReactNode;
}

export function ExpressionPopover({
  title,
  subTitle,
  placeholder,
  onOk = noop,
  defaultValue,
  value,
  dataSource,
  autoCompleteOptions,
  newStoreTemplate = CODE_TEMPLATES.newStoreTemplate,
  children,
}: ExpressionPopoverProps) {
  const [exp, setExp] = useState(value ?? defaultValue);
  const [error, setError] = useState('');
  const workspace = useWorkspace();

  const selectNodePath = workspace.selectSource.selected[0]?.codeId;

  const { expressionVariables } = useWorkspaceData();
  const serviceModules = Object.keys(workspace.serviceModules).map((key) => ({
    label: key === 'index' ? '默认模块' : key,
    value: key,
  }));

  const sandbox = useSandboxQuery();
  const evaluateContext = sandbox.window;

  const handleExpInputChange = (val: string) => {
    setExp(val?.trim());
  };

  useEffect(() => {
    setExp(value);
  }, [value]);

  return (
    <DragPanel
      width={700}
      title={`将 ${selectNodePath}/${title} 设置为引用变量或自定义表达式`}
      extra={subTitle}
      onOpenChange={(open) => {
        if (!open) {
          setExp(undefined);
          setError('');
        }
      }}
      popoverStyle={{
        height: '615px',
      }}
      body={
        <>
          <Panel shape="solid">
            <InputCode
              shape="inset"
              minHeight="56px"
              maxHeight="200px"
              value={exp}
              placeholder={placeholder}
              onChange={handleExpInputChange}
              onBlur={() => {
                setError(expressionValueValidate(exp));
              }}
              autoCompleteContext={evaluateContext}
              autoCompleteOptions={autoCompleteOptions}
            />
            {error ? (
              <Text color="red" fontSize="12px">
                出错了！输入的表达式存在语法错误，请修改后再提交！
              </Text>
            ) : (
              <Text fontSize="12px" color="text3">
                说明：你可以在上面的代码输入框里输入常规的 javascript 代码，还可以直接使用 jsx
                代码，但需要符合该属性的接受值定义。
              </Text>
            )}
          </Panel>
          <Panel
            title="从变量列表中选中"
            shape="solid"
            borderTop="0"
            overflow="hidden"
            bodyProps={{ overflow: 'hidden' }}
          >
            <VariableTree
              height={380}
              showViewButton
              dataSource={dataSource || expressionVariables}
              appContext={sandbox?.window['tango']}
              getStoreNames={() => Object.keys(workspace.storeModules)}
              serviceModules={serviceModules}
              getServiceData={(serviceKey) => {
                const data = workspace.getServiceFunction(serviceKey);
                return {
                  name: data.name,
                  moduleName: data.moduleName,
                  method: 'get',
                  ...data.config,
                };
              }}
              onSelect={(node) => {
                if (!node.key) {
                  return;
                }
                if (node.key.split('.').length < 2) {
                  return;
                }
                let str;
                if (/^(stores|services)\./.test(node.key)) {
                  str = `tango.${node.key.replaceAll('.', '?.')}`;
                } else {
                  str = `${node.key}`;
                }
                setExp(str);
              }}
              onAddStoreVariable={(storeName, data) => {
                workspace.addStoreState(storeName, data.name, data.initialValue);
              }}
              onUpdateStoreVariable={(variableKey, code) => {
                workspace.updateStoreVariable(variableKey, code);
              }}
              onAddStore={(storeName) => {
                workspace.addStoreFile(storeName, newStoreTemplate);
              }}
              onRemoveStoreVariable={(variableKey) => {
                workspace.removeStoreVariable(variableKey);
              }}
              onRemoveService={(serviceKey) => {
                workspace.removeServiceFunction(serviceKey);
              }}
              onAddService={(data) => {
                const { name, moduleName, ...payload } = shapeServiceValues(data);
                workspace.addServiceFunction(name, payload, moduleName);
              }}
              onUpdateService={(data) => {
                const { name, moduleName, ...payload } = shapeServiceValues(data);
                workspace.updateServiceFunction(name, payload, moduleName);
              }}
              getPreviewValue={(node) => {
                if (!node || !node.key) {
                  return;
                }

                if (node.type === 'function') {
                  return;
                }

                return getValue(evaluateContext['tango'], node.key);
              }}
            />
          </Panel>
        </>
      }
      footer={(close) => (
        <Box display="flex" justifyContent="flex-end" gap="5px">
          <Button
            type="primary"
            size="small"
            onClick={() => {
              if (!error) {
                onOk(exp);
                close();
              }
            }}
          >
            确认
          </Button>
          <Button size="small" onClick={close}>
            取消
          </Button>
        </Box>
      )}
    >
      {children || (
        <Action tooltip="打开表达式变量选择面板" icon={<ExpandAltOutlined />} size="small" />
      )}
    </DragPanel>
  );
}
